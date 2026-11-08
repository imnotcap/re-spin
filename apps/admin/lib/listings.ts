import 'server-only';
/**
 * Annoncer, moderation og advarsler i admin. Ingen adgangskontrol her – den sker i siderne/handlingerne
 * (requireStaff + audit). Alt der ændrer noget, gør det i én transaktion og kun fra en forventet tilstand.
 */
import { and, count, desc, eq, ilike, inArray, or, sql, type SQL } from 'drizzle-orm';
import { schema, type Db } from '@respin/db';
import { CATEGORIES as CATEGORY_CODES, type ListingCategory } from '@respin/core';
import { CATEGORIES } from '@respin/core/taxonomy';
import { adminEnv } from './env';

const { listings, listingImages, users, reports, userWarnings, auditLog, staffUsers, analyticsEvents, orders } = schema;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const likeOf = (q: string) => `%${q.replace(/[\\%_]/g, (m) => `\\${m}`)}%`;

/** Annoncebilleder ligger i Vercel Blob; admin kender kun den offentlige adresse (IMAGE_BASE_URL) */
export function imageUrl(key: string, size: 'thumb' | 'full' = 'thumb'): string | null {
  const base = adminEnv().IMAGE_BASE_URL;
  if (!base) return null;
  return `${base.replace(/\/$/, '')}/${size === 'thumb' ? key.replace(/\.webp$/, '-480.webp') : key}`;
}

export const STATUS_LABEL = { draft: 'Kladde', active: 'Til salg', reserved: 'Reserveret', sold: 'Solgt', removed: 'Fjernet' } as const;
export const MODERATION_LABEL = { pending: 'Venter', approved: 'Godkendt', rejected: 'Afvist' } as const;
export const categoryLabel = (slug: string) => CATEGORIES.find((c) => c.slug === slug)?.label ?? slug;
export const WARNING_REASONS = {
  prohibited_item: 'Forbudt vare', misleading: 'Vildledende annonce', offensive: 'Stødende indhold', spam: 'Spam eller dubletter',
  off_platform: 'Betaling eller kontakt uden om Videro', fraud: 'Mistanke om svindel', other: 'Brud på reglerne'
} as const;
export type WarningReason = keyof typeof WARNING_REASONS;
export const isWarningReason = (v: string): v is WarningReason => Object.hasOwn(WARNING_REASONS, v);

/** Færdige begrundelser til afvisning/fjernelse – kan rettes, før de sendes */
export const NOTE_TEMPLATES = [
  { id: 'forbudt', label: 'Forbudt vare', text: 'Varen må ikke sælges på Videro (se reglerne under "Forbudte varer").' },
  { id: 'betaling', label: 'Betaling udenom', text: 'Annoncen beder om betaling eller kontakt uden om Videro. Det er ikke tilladt – så mister køberen sin beskyttelse.' },
  { id: 'billeder', label: 'Billeder', text: 'Billederne viser ikke den vare, der sælges, eller er taget fra internettet. Brug dine egne billeder af varen.' },
  { id: 'kopi', label: 'Kopivare', text: 'Varen ser ud til at være en kopi af et mærke. Falske mærkevarer må ikke sælges.' },
  { id: 'dublet', label: 'Dublet', text: 'Den samme vare er sat til salg flere gange. Behold én annonce pr. vare.' },
  { id: 'kategori', label: 'Forkert kategori', text: 'Annoncen lå i en forkert kategori. Vi har flyttet den.' }
] as const;

/* ------------------------------ Oversigt ------------------------------ */

export interface ListingFilter { q?: string; status?: string; moderation?: string; category?: string; reported?: boolean; sort?: 'new' | 'old' | 'views' | 'price'; page?: number }
export const PAGE_SIZE = 50;

const views30 = sql<number>`(select count(*)::int from ${analyticsEvents} ae where ae.listing_id = ${listings.id} and ae.type = 'listing_view' and ae.at > now() - interval '30 days')`.mapWith(Number);
const openReports = sql<number>`(select count(*)::int from ${reports} r where r.target_type = 'listing' and r.target_id = ${listings.id} and r.status = 'open')`.mapWith(Number);
const coverKey = sql<string | null>`(select li.storage_key from ${listingImages} li where li.listing_id = ${listings.id} order by li.position limit 1)`;

export async function searchListings(db: Db, f: ListingFilter) {
  const where: SQL[] = [];
  const q = (f.q ?? '').trim().slice(0, 100);
  if (q) where.push(UUID.test(q) ? or(eq(listings.id, q), eq(listings.sellerId, q))! : or(ilike(listings.title, likeOf(q)), ilike(listings.brand, likeOf(q)), ilike(users.displayName, likeOf(q)), ilike(users.username, likeOf(q)), ilike(users.email, likeOf(q)))!);
  if (f.status && f.status in STATUS_LABEL) where.push(eq(listings.status, f.status as keyof typeof STATUS_LABEL));
  if (f.moderation && f.moderation in MODERATION_LABEL) where.push(eq(listings.moderationStatus, f.moderation as keyof typeof MODERATION_LABEL));
  if (f.category && (CATEGORY_CODES as readonly string[]).includes(f.category)) where.push(eq(listings.category, f.category as ListingCategory));
  if (f.reported) where.push(sql`${openReports} > 0`);
  const order = f.sort === 'old' ? listings.createdAt : f.sort === 'views' ? desc(views30) : f.sort === 'price' ? desc(listings.priceOre) : desc(listings.createdAt);
  const page = Math.max(0, Math.min(f.page ?? 0, 1000));
  const cond = where.length ? and(...where) : undefined;
  const [rows, [total]] = await Promise.all([
    db.select({
      id: listings.id, title: listings.title, brand: listings.brand, priceOre: listings.priceOre, status: listings.status, moderation: listings.moderationStatus,
      category: listings.category, sub: listings.subcategory, createdAt: listings.createdAt, sellerId: users.id, sellerName: users.displayName, sellerStatus: users.status,
      views: views30, reports: openReports, cover: coverKey
    }).from(listings).innerJoin(users, eq(users.id, listings.sellerId)).where(cond).orderBy(order).limit(PAGE_SIZE).offset(page * PAGE_SIZE),
    db.select({ n: count() }).from(listings).innerJoin(users, eq(users.id, listings.sellerId)).where(cond)
  ]);
  return { rows: rows.map((r) => ({ ...r, thumb: r.cover ? imageUrl(r.cover) : null })), total: total?.n ?? 0, page };
}

/* ------------------------------ Én annonce ------------------------------ */

export async function getListingAdmin(db: Db, id: string) {
  if (!UUID.test(id)) return null;
  const [l] = await db.select({
    id: listings.id, title: listings.title, description: listings.description, brand: listings.brand, size: listings.size, condition: listings.condition,
    priceOre: listings.priceOre, shipping: listings.shippingSize, status: listings.status, moderation: listings.moderationStatus, note: listings.moderationNote,
    moderatedAt: listings.moderatedAt, category: listings.category, sub: listings.subcategory, createdAt: listings.createdAt, updatedAt: listings.updatedAt,
    sellerId: users.id, sellerName: users.displayName, sellerUsername: users.username, sellerEmail: users.email, sellerStatus: users.status, sellerCreated: users.createdAt
  }).from(listings).innerJoin(users, eq(users.id, listings.sellerId)).where(eq(listings.id, id));
  if (!l) return null;
  const [imgs, listingReports, history, stats, daily, warnings, sellerCounts, hasOrders] = await Promise.all([
    db.select({ key: listingImages.storageKey }).from(listingImages).where(eq(listingImages.listingId, id)).orderBy(listingImages.position),
    db.select({ id: reports.id, reason: reports.reason, status: reports.status, createdAt: reports.createdAt, reporter: users.displayName, reporterId: users.id })
      .from(reports).leftJoin(users, eq(users.id, reports.reporterId)).where(and(eq(reports.targetType, 'listing'), eq(reports.targetId, id))).orderBy(desc(reports.createdAt)).limit(50),
    db.select({ action: auditLog.action, at: auditLog.createdAt, actor: staffUsers.email, actorName: staffUsers.displayName, metadata: auditLog.metadata })
      .from(auditLog).leftJoin(staffUsers, and(eq(auditLog.actorType, 'staff'), sql`${staffUsers.id}::text = ${auditLog.actorId}`))
      .where(and(eq(auditLog.targetType, 'listing'), eq(auditLog.targetId, id))).orderBy(desc(auditLog.createdAt)).limit(50),
    db.select({
      views: sql<number>`count(*) filter (where ${analyticsEvents.type} = 'listing_view')`.mapWith(Number),
      visitors: sql<number>`count(distinct ${analyticsEvents.visitor}) filter (where ${analyticsEvents.type} = 'listing_view')`.mapWith(Number),
      clicks: sql<number>`count(*) filter (where ${analyticsEvents.type} = 'click')`.mapWith(Number),
      favorites: sql<number>`coalesce(sum(${analyticsEvents.num}) filter (where ${analyticsEvents.type} = 'favorite'), 0)`.mapWith(Number)
    }).from(analyticsEvents).where(eq(analyticsEvents.listingId, id)),
    db.execute<{ day: string; n: number }>(sql`
      with d as (select generate_series((now() at time zone 'Europe/Copenhagen')::date - 13, (now() at time zone 'Europe/Copenhagen')::date, interval '1 day')::date as day)
      select to_char(d.day, 'YYYY-MM-DD') as day, (select count(*)::int from ${analyticsEvents} e where e.listing_id = ${id} and e.type = 'listing_view' and (e.at at time zone 'Europe/Copenhagen')::date = d.day) as n
      from d order by d.day`),
    db.select({ id: userWarnings.id, reason: userWarnings.reason, message: userWarnings.message, createdAt: userWarnings.createdAt })
      .from(userWarnings).where(eq(userWarnings.listingId, id)).orderBy(desc(userWarnings.createdAt)),
    db.select({ listings: sql<number>`count(*)`.mapWith(Number), warnings: sql<number>`(select count(*)::int from ${userWarnings} w where w.user_id = ${l.sellerId})`.mapWith(Number) })
      .from(listings).where(eq(listings.sellerId, l.sellerId)),
    db.select({ n: count() }).from(orders).where(eq(orders.listingId, id))
  ]);
  const list = (Array.isArray(daily) ? daily : (daily as unknown as { rows: unknown[] }).rows) as Array<{ day: string; n: number }>;
  return {
    ...l, images: imgs.map((i) => ({ thumb: imageUrl(i.key), full: imageUrl(i.key, 'full') })),
    reports: listingReports, history, stats: stats[0]!, daily: list.map((r) => ({ day: r.day, n: Number(r.n) })), warnings,
    sellerListings: sellerCounts[0]?.listings ?? 0, sellerWarnings: sellerCounts[0]?.warnings ?? 0, hasOrders: (hasOrders[0]?.n ?? 0) > 0
  };
}

/* ------------------------------ Handlinger ------------------------------ */

export type ListingOp = 'approve' | 'reject' | 'remove' | 'restore' | 'to_review';
const cleanNote = (s: string) => s.normalize('NFC').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '').trim().slice(0, 500);

/**
 * Moderation af én annonce:
 *  - approve: godkend (vises for alle, hvis den er til salg)
 *  - reject: afvis med begrundelse (skjules; sælgeren ser begrundelsen og kan rette annoncen)
 *  - remove: fjern med begrundelse (status "fjernet" – kan ikke sættes til salg igen af sælgeren)
 *  - restore: fortryd en fjernelse (tilbage som aktiv og godkendt)
 *  - to_review: send tilbage til gennemgang (skjules, til en medarbejder har set på den)
 * Reserverede/solgte annoncer med ordrer kan ikke fjernes her (ordren skal håndteres først).
 */
export async function moderate(db: Db, staffId: string, id: string, op: ListingOp, note: string, now = new Date()): Promise<{ ok: true } | { ok: false; error: 'not_found' | 'note_required' | 'invalid_state' }> {
  if (!UUID.test(id)) return { ok: false, error: 'not_found' };
  const n = cleanNote(note);
  if ((op === 'reject' || op === 'remove') && n.length < 5) return { ok: false, error: 'note_required' };
  const base = { moderatedBy: staffId, moderatedAt: now, updatedAt: now };
  const [cur] = await db.select({ status: listings.status }).from(listings).where(eq(listings.id, id));
  if (!cur) return { ok: false, error: 'not_found' };
  let r: { id: string }[] = [];
  switch (op) {
    case 'approve':
      r = await db.update(listings).set({ ...base, moderationStatus: 'approved', moderationNote: null }).where(eq(listings.id, id)).returning({ id: listings.id }); break;
    case 'reject':
      r = await db.update(listings).set({ ...base, moderationStatus: 'rejected', moderationNote: n }).where(and(eq(listings.id, id), inArray(listings.status, ['draft', 'active', 'sold']))).returning({ id: listings.id }); break;
    case 'remove':
      r = await db.update(listings).set({ ...base, status: 'removed', moderationStatus: 'rejected', moderationNote: n }).where(and(eq(listings.id, id), inArray(listings.status, ['draft', 'active', 'sold']))).returning({ id: listings.id }); break;
    case 'restore':
      r = await db.update(listings).set({ ...base, status: 'active', moderationStatus: 'approved', moderationNote: null }).where(and(eq(listings.id, id), eq(listings.status, 'removed'))).returning({ id: listings.id }); break;
    case 'to_review':
      r = await db.update(listings).set({ ...base, moderationStatus: 'pending' }).where(and(eq(listings.id, id), inArray(listings.status, ['draft', 'active']))).returning({ id: listings.id }); break;
  }
  return r.length === 1 ? { ok: true } : { ok: false, error: 'invalid_state' };
}

/** Flyt annoncen til en anden kategori/underkategori (fx når sælgeren har valgt forkert) */
export async function recategorize(db: Db, staffId: string, id: string, category: string, sub: string): Promise<boolean> {
  const cat = CATEGORIES.find((c) => c.slug === category);
  if (!UUID.test(id) || !cat || (sub && !cat.subs.includes(sub))) return false;
  const r = await db.update(listings).set({ category: cat.slug as ListingCategory, subcategory: sub || null, moderatedBy: staffId, moderatedAt: new Date(), updatedAt: new Date() })
    .where(eq(listings.id, id)).returning({ id: listings.id });
  return r.length === 1;
}

/** Slet permanent (kun administratorer). Billedrækkerne slettes med (ON DELETE CASCADE). Annoncer med ordrer kan ikke slettes. */
export async function deleteListing(db: Db, id: string): Promise<{ ok: true; title: string; sellerId: string } | { ok: false; error: 'not_found' | 'has_orders' }> {
  if (!UUID.test(id)) return { ok: false, error: 'not_found' };
  return db.transaction(async (tx) => {
    const [l] = await tx.select({ title: listings.title, sellerId: listings.sellerId }).from(listings).where(eq(listings.id, id)).for('update');
    if (!l) return { ok: false as const, error: 'not_found' as const };
    const [o] = await tx.select({ n: count() }).from(orders).where(eq(orders.listingId, id));
    if ((o?.n ?? 0) > 0) return { ok: false as const, error: 'has_orders' as const };
    await tx.delete(listings).where(eq(listings.id, id));
    return { ok: true as const, title: l.title, sellerId: l.sellerId };
  });
}

/* ------------------------------ Advarsler ------------------------------ */

export async function warnUser(db: Db, staffId: string, input: { userId: string; reason: string; message: string; listingId?: string }): Promise<{ ok: true; total: number } | { ok: false; error: 'invalid' }> {
  const message = cleanNote(input.message.slice(0, 1000)).slice(0, 1000);
  if (!UUID.test(input.userId) || !isWarningReason(input.reason) || message.length < 5) return { ok: false, error: 'invalid' };
  const listingId = input.listingId && UUID.test(input.listingId) ? input.listingId : null;
  await db.insert(userWarnings).values({ userId: input.userId, staffId, reason: input.reason, message, listingId });
  const [c] = await db.select({ n: count() }).from(userWarnings).where(eq(userWarnings.userId, input.userId));
  return { ok: true, total: c?.n ?? 1 };
}

export async function warningsForUser(db: Db, userId: string) {
  if (!UUID.test(userId)) return [];
  return db.select({ id: userWarnings.id, reason: userWarnings.reason, message: userWarnings.message, createdAt: userWarnings.createdAt, seenAt: userWarnings.seenAt,
    listingId: userWarnings.listingId, listingTitle: listings.title, staff: staffUsers.displayName, staffEmail: staffUsers.email })
    .from(userWarnings).leftJoin(listings, eq(listings.id, userWarnings.listingId)).leftJoin(staffUsers, eq(staffUsers.id, userWarnings.staffId))
    .where(eq(userWarnings.userId, userId)).orderBy(desc(userWarnings.createdAt)).limit(100);
}

/* ------------------------------ Anmeldelser med mål ------------------------------ */

/** Åbne anmeldelser med annoncens titel, billede, sælger og antal anmeldelser af samme mål */
export async function openReportsDetailed(db: Db) {
  const rows = await db.select({ id: reports.id, targetType: reports.targetType, targetId: reports.targetId, reason: reports.reason, createdAt: reports.createdAt, reporter: users.displayName, reporterId: users.id })
    .from(reports).leftJoin(users, eq(users.id, reports.reporterId)).where(eq(reports.status, 'open')).orderBy(reports.createdAt).limit(200);
  const ids = [...new Set(rows.filter((r) => r.targetType === 'listing').map((r) => r.targetId))];
  const targets = ids.length ? await db.select({ id: listings.id, title: listings.title, status: listings.status, moderation: listings.moderationStatus, sellerId: listings.sellerId, sellerName: users.displayName, cover: coverKey })
    .from(listings).innerJoin(users, eq(users.id, listings.sellerId)).where(inArray(listings.id, ids)) : [];
  const byId = new Map(targets.map((t) => [t.id, { ...t, thumb: t.cover ? imageUrl(t.cover) : null }]));
  const counts = new Map<string, number>();
  for (const r of rows) counts.set(r.targetId, (counts.get(r.targetId) ?? 0) + 1);
  return rows.map((r) => ({ ...r, listing: byId.get(r.targetId) ?? null, sameTarget: counts.get(r.targetId) ?? 1 }));
}

/** Luk alle åbne anmeldelser af en annonce (når der er handlet på den) */
export async function closeReportsFor(db: Db, staffId: string, listingId: string, decision: 'actioned' | 'dismissed', now = new Date()): Promise<number> {
  if (!UUID.test(listingId)) return 0;
  const r = await db.update(reports).set({ status: decision, handledBy: staffId, handledAt: now })
    .where(and(eq(reports.targetType, 'listing'), eq(reports.targetId, listingId), eq(reports.status, 'open'))).returning({ id: reports.id });
  return r.length;
}

/** Ventende annoncer med billeder (moderationskøen) */
export async function pendingWithImages(db: Db) {
  const rows = await db.select({ id: listings.id, title: listings.title, description: listings.description, priceOre: listings.priceOre, createdAt: listings.createdAt,
    category: listings.category, sub: listings.subcategory, sellerId: users.id, sellerName: users.displayName, cover: coverKey,
    warnings: sql<number>`(select count(*)::int from ${userWarnings} w where w.user_id = ${users.id})`.mapWith(Number) })
    .from(listings).innerJoin(users, eq(users.id, listings.sellerId))
    .where(and(eq(listings.moderationStatus, 'pending'), inArray(listings.status, ['active', 'draft']))).orderBy(listings.createdAt).limit(100);
  return rows.map((r) => ({ ...r, thumb: r.cover ? imageUrl(r.cover) : null }));
}
