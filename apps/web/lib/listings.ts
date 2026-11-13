import 'server-only';
import { and, desc, eq, inArray, isNotNull, isNull, or, sql, type SQL } from 'drizzle-orm';
import { z } from 'zod';
import { schema, type Db } from '@respin/db';
import { CATEGORIES as CATEGORY_CODES, assessMessageRisk, createListingInput, type ListingCategory, type ListingCondition } from '@respin/core';
import { CONDITION_LABEL, subsOf } from './listing-labels';
import { subsMatching } from './categories';
import { thumbKey, type ImageStore } from './image-store';

const { listings, listingImages, users, sellerProfiles, listingPromotions, analyticsEvents } = schema;

/** Er annoncen fremhævet lige nu (betalt, og nu ligger i perioden)? */
const promotedNow = sql<boolean>`exists (select 1 from ${listingPromotions} lp where lp.listing_id = ${listings.id} and lp.status = 'paid' and lp.starts_at <= now() and lp.ends_at > now())`;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export type ListingError = 'invalid_input' | 'invalid_subcategory' | 'invalid_images' | 'not_found';
export type Result<T = object> = ({ ok: true } & T) | { ok: false; error: ListingError; field?: string };

/** Det redigerbare: alt undtagen billederne */
const editInput = createListingInput.omit({ imageKeys: true });

/** Tekst der tyder på handel uden om platformen (MobilePay, telefonnummer, links) → manuel gennemgang før visning */
function moderationFor(title: string, description: string, brand?: string): 'approved' | 'pending' {
  return assessMessageRisk([title, brand ?? '', description].join('\n')).level === 'high' ? 'pending' : 'approved';
}

function checkSub(category: string, sub: string | undefined): boolean {
  return !sub || subsOf(category).includes(sub);
}

const firstIssue = (e: z.ZodError) => String(e.issues[0]?.path[0] ?? '');

/**
 * Opret annonce. Billederne skal være uploadet af SAMME bruger, være færdigbehandlede og ikke allerede
 * brugt i en anden annonce – ellers rulles alt tilbage (ingen halve annoncer, ingen lån af andres billeder).
 */
export async function createListing(db: Db, sellerId: string, raw: unknown): Promise<Result<{ id: string; moderation: 'approved' | 'pending' }>> {
  const p = createListingInput.safeParse(raw);
  if (!p.success) return { ok: false, error: 'invalid_input', field: firstIssue(p.error) };
  const v = p.data;
  if (!checkSub(v.category, v.subcategory)) return { ok: false, error: 'invalid_subcategory', field: 'subcategory' };
  if (new Set(v.imageKeys).size !== v.imageKeys.length) return { ok: false, error: 'invalid_images', field: 'imageKeys' };
  const moderation = moderationFor(v.title, v.description, v.brand);
  try {
    const id = await db.transaction(async (tx) => {
      const [row] = await tx.insert(listings).values({
        sellerId, title: v.title, description: v.description, category: v.category, subcategory: v.subcategory || null,
        brand: v.brand || null, size: v.size || null, condition: v.condition, priceOre: v.priceOre, shippingSize: v.shippingSize,
        status: 'active', moderationStatus: moderation
      }).returning({ id: listings.id });
      for (const [position, imageId] of v.imageKeys.entries()) {
        const claimed = await tx.update(listingImages).set({ listingId: row!.id, position })
          .where(and(eq(listingImages.id, imageId), eq(listingImages.ownerId, sellerId), isNull(listingImages.listingId), eq(listingImages.scanStatus, 'clean')))
          .returning({ id: listingImages.id });
        if (claimed.length !== 1) throw new ImagesError();
      }
      return row!.id;
    });
    return { ok: true, id, moderation };
  } catch (e) {
    if (e instanceof ImagesError) return { ok: false, error: 'invalid_images', field: 'imageKeys' };
    throw e;
  }
}
class ImagesError extends Error {}

/** Redigér egen annonce (ikke reserverede eller fjernede). En anden brugers id giver 'not_found' – ingen forskel at se. */
export async function updateListing(db: Db, sellerId: string, id: string, raw: unknown): Promise<Result> {
  if (!UUID.test(id)) return { ok: false, error: 'not_found' };
  const p = editInput.safeParse(raw);
  if (!p.success) return { ok: false, error: 'invalid_input', field: firstIssue(p.error) };
  const v = p.data;
  if (!checkSub(v.category, v.subcategory)) return { ok: false, error: 'invalid_subcategory', field: 'subcategory' };
  const rows = await db.update(listings).set({
    title: v.title, description: v.description, category: v.category, subcategory: v.subcategory || null, brand: v.brand || null,
    size: v.size || null, condition: v.condition, priceOre: v.priceOre, shippingSize: v.shippingSize,
    moderationStatus: moderationFor(v.title, v.description, v.brand), updatedAt: new Date()
  }).where(and(eq(listings.id, id), eq(listings.sellerId, sellerId), inArray(listings.status, ['active', 'sold', 'draft'])))
    .returning({ id: listings.id });
  return rows.length ? { ok: true } : { ok: false, error: 'not_found' };
}

export type StatusAction = 'sold' | 'active' | 'removed';
const FROM: Record<StatusAction, Array<'active' | 'sold' | 'draft'>> = { sold: ['active'], active: ['sold'], removed: ['active', 'sold', 'draft'] };

/** Markér som solgt / sæt til salg igen / fjern. Reserverede annoncer (aktiv ordre) kan ikke ændres her. */
export async function setListingStatus(db: Db, sellerId: string, id: string, action: StatusAction): Promise<Result> {
  if (!UUID.test(id) || !(action in FROM)) return { ok: false, error: 'not_found' };
  const rows = await db.update(listings).set({ status: action, updatedAt: new Date() })
    .where(and(eq(listings.id, id), eq(listings.sellerId, sellerId), inArray(listings.status, FROM[action])))
    .returning({ id: listings.id });
  return rows.length ? { ok: true } : { ok: false, error: 'not_found' };
}

/* --------------------------------- Læsning --------------------------------- */

export interface ListingImage { src: string; srcSet: string; width: number | null; height: number | null }
export interface ListingCardData {
  id: string; title: string; brand: string; size: string; condition: string; price: number;
  category: ListingCategory; sub: string; createdAt: string; image: ListingImage | null;
  /** avatar: adressen på sælgerens profilbillede (null = forbogstav) */
  seller: { name: string; certified: boolean; avatar: string | null };
  /** Antal, der har gemt annoncen som favorit (indloggede brugere) */
  favorites: number;
  /** Købt fremhævning, der kører lige nu */
  promoted?: boolean;
  /** Visninger de seneste 30 dage (statistik uden cookies) – bruges til "Mest populære" */
  views?: number;
}

const imageOf = (store: ImageStore, key: string, width: number | null, height: number | null): ListingImage => ({
  src: store.urlFor(thumbKey(key)),
  srcSet: `${store.urlFor(thumbKey(key))} 480w, ${store.urlFor(key)} 1600w`,
  width, height
});

async function coverImages(db: Db, store: ImageStore, ids: string[]): Promise<Map<string, ListingImage>> {
  if (!ids.length) return new Map();
  const rows = await db.select({ listingId: listingImages.listingId, key: listingImages.storageKey, w: listingImages.width, h: listingImages.height })
    .from(listingImages).where(and(inArray(listingImages.listingId, ids), eq(listingImages.position, 0), eq(listingImages.scanStatus, 'clean')));
  return new Map(rows.map((r) => [r.listingId!, imageOf(store, r.key, r.w, r.h)]));
}

const cardColumns = {
  id: listings.id, title: listings.title, brand: listings.brand, size: listings.size, condition: listings.condition, priceOre: listings.priceOre,
  category: listings.category, sub: listings.subcategory, createdAt: listings.createdAt, status: listings.status,
  sellerName: users.displayName, certified: sellerProfiles.certified, sellerAvatarKey: users.avatarKey,
  // Tabelnavnet skrives ud: i forespørgsler uden join skriver Drizzle kolonner uden tabel, og så ville "id" pege forkert
  favCount: sql<number>`(select count(*)::int from ${schema.favorites} f where f.listing_id = "listings"."id")`.mapWith(Number)
};
type CardRow = { id: string; title: string; brand: string | null; size: string | null; condition: ListingCondition; priceOre: number; category: ListingCategory; sub: string | null; createdAt: Date; sellerName: string; certified: boolean | null; sellerAvatarKey: string | null; favCount: number };

const toCard = (r: CardRow, images: Map<string, ListingImage>, store: ImageStore): ListingCardData => ({
  id: r.id, title: r.title, brand: r.brand ?? '', size: r.size ?? '', condition: CONDITION_LABEL[r.condition], price: r.priceOre / 100,
  category: r.category, sub: r.sub ?? '', createdAt: r.createdAt.toISOString(), image: images.get(r.id) ?? null,
  seller: { name: r.sellerName, certified: !!r.certified, avatar: r.sellerAvatarKey ? store.urlFor(r.sellerAvatarKey) : null },
  favorites: Number(r.favCount) || 0
});

/** Escape %, _ og \ i LIKE-mønstre, så søgning efter "50%" ikke matcher alt */
export const likeEscape = (s: string) => s.replace(/[\\%_]/g, (c) => `\\${c}`);

export const feedQuery = z.object({
  category: z.enum(CATEGORY_CODES).optional(),
  q: z.string().max(100).optional(),
  /** Kun én sælgers annoncer (profilsiden) */
  sellerId: z.uuid().optional(),
  /** Bestemte annoncer (favoritter) */
  ids: z.array(z.uuid()).max(100).optional(),
  limit: z.coerce.number().int().min(1).max(48).default(24)
});

/** Synlig for alle: aktiv, godkendt og fra en aktiv bruger */
const visible = () => [eq(listings.status, 'active'), eq(listings.moderationStatus, 'approved'), eq(users.status, 'active')];

/** Visninger pr. annonce de seneste 30 dage */
const views30 = sql<number>`(select count(*)::int from ${analyticsEvents} ae where ae.listing_id = ${listings.id} and ae.type = 'listing_view' and ae.at > now() - interval '30 days')`;

async function queryCards(db: Db, store: ImageStore, f: Omit<z.output<typeof feedQuery>, 'limit'>, limit: number): Promise<ListingCardData[]> {
  const where: SQL[] = visible();
  if (f.category) where.push(eq(listings.category, f.category));
  if (f.sellerId) where.push(eq(listings.sellerId, f.sellerId));
  if (f.ids) { if (!f.ids.length) return []; where.push(inArray(listings.id, f.ids)); }
  for (const w of (f.q ?? '').normalize('NFC').toLocaleLowerCase('da-DK').split(/\s+/).filter(Boolean).slice(0, 6)) {
    const pat = `%${likeEscape(w)}%`;
    // Typer fra kategoritræet: "trenchcoat" finder også annoncer under "Frakker og jakker"
    const subs = subsMatching(w);
    const bySub = subs.length ? sql` OR ${inArray(listings.subcategory, subs)}` : sql``;
    where.push(sql`(${listings.title} ILIKE ${pat} OR coalesce(${listings.brand}, '') ILIKE ${pat} OR coalesce(${listings.subcategory}, '') ILIKE ${pat}${bySub})`);
  }
  // Fremhævede annoncer først, derefter nyeste
  const rows = await db.select({ ...cardColumns, promoted: promotedNow, views: views30 }).from(listings).innerJoin(users, eq(users.id, listings.sellerId))
    .leftJoin(sellerProfiles, eq(sellerProfiles.userId, listings.sellerId))
    .where(and(...where)).orderBy(desc(promotedNow), desc(listings.createdAt)).limit(limit);
  const images = await coverImages(db, store, rows.map((r) => r.id));
  return rows.map((r) => ({ ...toCard(r, images, store), promoted: !!r.promoted, views: Number(r.views) || 0 })).filter((c) => c.image);
}

/** Offentligt feed: kun aktive, godkendte annoncer fra aktive brugere – nyeste først (højst 48) */
export async function listFeed(db: Db, store: ImageStore, input: z.input<typeof feedQuery>): Promise<ListingCardData[]> {
  const f = feedQuery.parse(input);
  return queryCards(db, store, f, f.limit);
}

/** Til lister med filtre i browseren (kategori, søgning): op til 240 annoncer */
export const BROWSE_LIMIT = 240;
export async function listForBrowse(db: Db, store: ImageStore, input: { category?: ListingCategory; q?: string }): Promise<ListingCardData[]> {
  const f = feedQuery.omit({ limit: true }).parse(input);
  return queryCards(db, store, f, BROWSE_LIMIT);
}

/* ------------------------------ Tal til menu, forside og mærker ------------------------------ */

export interface CategoryStats {
  count: number; newWeek: number; likeNew: number; under200: number;
  brands: { brand: string; count: number }[];
  /** Den underkategori med flest annoncer og et billede fra den */
  focus?: { sub: string; image: ListingImage };
}
export interface SiteStats { cats: Partial<Record<ListingCategory, CategoryStats>>; brands: { brand: string; count: number }[]; total: number }

export async function siteStats(db: Db, store: ImageStore): Promise<SiteStats> {
  const base = and(...visible());
  const [perCat, brandRows, subRows] = await Promise.all([
    db.select({
      category: listings.category, n: sql<number>`count(*)::int`,
      newWeek: sql<number>`count(*) filter (where ${listings.createdAt} > now() - interval '7 days')::int`,
      likeNew: sql<number>`count(*) filter (where ${listings.condition} = 'new_with_tag')::int`,
      under200: sql<number>`count(*) filter (where ${listings.priceOre} < 20000)::int`
    }).from(listings).innerJoin(users, eq(users.id, listings.sellerId)).where(base).groupBy(listings.category),
    db.select({ category: listings.category, brand: sql<string>`trim(${listings.brand})`, n: sql<number>`count(*)::int` })
      .from(listings).innerJoin(users, eq(users.id, listings.sellerId))
      .where(and(base, sql`coalesce(trim(${listings.brand}), '') <> ''`)).groupBy(listings.category, sql`trim(${listings.brand})`),
    db.select({ category: listings.category, sub: listings.subcategory, n: sql<number>`count(*)::int`, newest: sql<string>`(array_agg(${listings.id} order by ${listings.createdAt} desc))[1]` })
      .from(listings).innerJoin(users, eq(users.id, listings.sellerId))
      .where(and(base, sql`${listings.subcategory} is not null`)).groupBy(listings.category, listings.subcategory)
  ]);
  const bySubTop = new Map<string, { sub: string; id: string; n: number }>();
  for (const r of subRows) {
    const cur = bySubTop.get(r.category);
    if (r.sub && (!cur || r.n > cur.n)) bySubTop.set(r.category, { sub: r.sub, id: r.newest, n: r.n });
  }
  const images = await coverImages(db, store, [...bySubTop.values()].map((x) => x.id));
  const brandTotals = new Map<string, number>();
  for (const r of brandRows) brandTotals.set(r.brand, (brandTotals.get(r.brand) ?? 0) + r.n);
  const cats: SiteStats['cats'] = {};
  for (const r of perCat) {
    const top = bySubTop.get(r.category);
    const img = top ? images.get(top.id) : undefined;
    cats[r.category] = {
      count: r.n, newWeek: r.newWeek, likeNew: r.likeNew, under200: r.under200,
      brands: brandRows.filter((b) => b.category === r.category).sort((a, b) => b.n - a.n || a.brand.localeCompare(b.brand, 'da')).slice(0, 8).map((b) => ({ brand: b.brand, count: b.n })),
      focus: top && img ? { sub: top.sub, image: img } : undefined
    };
  }
  return {
    cats,
    brands: [...brandTotals].map(([brand, count]) => ({ brand, count })).sort((a, b) => a.brand.localeCompare(b.brand, 'da')),
    total: perCat.reduce((s, r) => s + r.n, 0)
  };
}

/** Til sitemap: synlige annoncer og profiler */
export async function sitemapEntries(db: Db) {
  const [ls, ps] = await Promise.all([
    db.select({ id: listings.id, updatedAt: listings.updatedAt }).from(listings).innerJoin(users, eq(users.id, listings.sellerId))
      .where(and(...visible())).orderBy(desc(listings.updatedAt)).limit(5000),
    db.select({ username: users.username }).from(users).where(and(eq(users.status, 'active'), sql`${users.username} is not null`)).limit(5000)
  ]);
  return { listings: ls, profiles: ps.map((p) => p.username!).filter(Boolean) };
}

/** Den indloggede brugers egne annonce-id'er (så man ikke kan sætte hjerte på sine egne) */
export async function ownListingIds(db: Db, sellerId: string): Promise<string[]> {
  const rows = await db.select({ id: listings.id }).from(listings).where(and(eq(listings.sellerId, sellerId), inArray(listings.status, ['draft', 'active', 'reserved', 'sold']))).limit(500);
  return rows.map((r) => r.id);
}

export interface ListingDetail extends ListingCardData {
  description: string; conditionCode: ListingCondition; parcel: 'small' | 'medium'; status: 'draft' | 'active' | 'reserved' | 'sold' | 'removed';
  moderation: 'pending' | 'approved' | 'rejected'; images: Array<ListingImage & { alt: string }>; isOwner: boolean; sellerId: string;
  /** Sælgerens profilnavn (/@/<navn>), hvis det er sat */
  sellerUsername: string | null;
}

/**
 * Én annonce. Andre ser den kun, når den er godkendt og ikke fjernet. Ejeren ser også sine egne, der
 * venter på gennemgang. Alt andet (inkl. forkert id-format) er "findes ikke".
 */
export async function getListing(db: Db, store: ImageStore, id: string, viewerId?: string | null): Promise<ListingDetail | null> {
  if (!UUID.test(id)) return null;
  const [r] = await db.select({ ...cardColumns, description: listings.description, shippingSize: listings.shippingSize, moderation: listings.moderationStatus, sellerId: listings.sellerId, userStatus: users.status, sellerUsername: users.username })
    .from(listings).innerJoin(users, eq(users.id, listings.sellerId)).leftJoin(sellerProfiles, eq(sellerProfiles.userId, listings.sellerId))
    .where(eq(listings.id, id));
  if (!r || r.status === 'removed') return null;
  const isOwner = !!viewerId && viewerId === r.sellerId;
  if (!isOwner && (r.moderation !== 'approved' || r.userStatus !== 'active' || r.status === 'draft')) return null;
  const imgs = await db.select({ key: listingImages.storageKey, w: listingImages.width, h: listingImages.height }).from(listingImages)
    .where(and(eq(listingImages.listingId, id), eq(listingImages.scanStatus, 'clean'))).orderBy(listingImages.position);
  const images = imgs.map((i, n) => ({ ...imageOf(store, i.key, i.w, i.h), alt: `${r.title}${r.brand ? ` fra ${r.brand}` : ''}, billede ${n + 1}` }));
  return {
    ...toCard(r, new Map(images[0] ? [[r.id, images[0]]] : []), store), description: r.description, conditionCode: r.condition, parcel: r.shippingSize,
    status: r.status, moderation: r.moderation, images, isOwner, sellerId: r.sellerId, sellerUsername: r.sellerUsername
  };
}

/** Til redigering: kun ejerens egne, ikke fjernede/reserverede */
export async function getOwnListingForEdit(db: Db, sellerId: string, id: string) {
  if (!UUID.test(id)) return null;
  const [r] = await db.select().from(listings).where(and(eq(listings.id, id), eq(listings.sellerId, sellerId), inArray(listings.status, ['active', 'sold', 'draft'])));
  return r ?? null;
}

export interface MyListing extends ListingCardData {
  status: ListingDetail['status']; moderation: ListingDetail['moderation'];
  /** Begrundelse fra Videro, hvis annoncen er afvist eller fjernet af en medarbejder */
  moderationNote: string | null;
}

/** Sælgerens egne annoncer – også dem, Videro har fjernet (med begrundelse), men ikke dem, sælgeren selv har fjernet */
export async function myListings(db: Db, store: ImageStore, sellerId: string): Promise<MyListing[]> {
  const rows = await db.select({ ...cardColumns, moderation: listings.moderationStatus, moderationNote: listings.moderationNote }).from(listings)
    .innerJoin(users, eq(users.id, listings.sellerId)).leftJoin(sellerProfiles, eq(sellerProfiles.userId, listings.sellerId))
    .where(and(eq(listings.sellerId, sellerId), or(inArray(listings.status, ['draft', 'active', 'reserved', 'sold']), and(eq(listings.status, 'removed'), isNotNull(listings.moderatedBy)))))
    .orderBy(desc(listings.createdAt)).limit(200);
  const images = await coverImages(db, store, rows.map((r) => r.id));
  return rows.map((r) => ({ ...toCard(r, images, store), status: r.status, moderation: r.moderation, moderationNote: r.moderationNote }));
}

/* ------------------------------ Advarsler ------------------------------ */

export const WARNING_REASON_LABEL = {
  prohibited_item: 'Forbudt vare', misleading: 'Vildledende annonce', offensive: 'Stødende indhold', spam: 'Spam eller dubletter',
  off_platform: 'Betaling eller kontakt uden om Videro', fraud: 'Mistanke om svindel', other: 'Brud på reglerne'
} as const;

/** Advarsler til brugeren (nyeste først). Ulæste markeres som set, når de vises. */
export async function warningsFor(db: Db, userId: string) {
  const { userWarnings } = schema;
  const rows = await db.select({ id: userWarnings.id, reason: userWarnings.reason, message: userWarnings.message, createdAt: userWarnings.createdAt, seenAt: userWarnings.seenAt, listingTitle: listings.title })
    .from(userWarnings).leftJoin(listings, eq(listings.id, userWarnings.listingId))
    .where(eq(userWarnings.userId, userId)).orderBy(desc(userWarnings.createdAt)).limit(20);
  const unseen = rows.filter((r) => !r.seenAt).map((r) => r.id);
  if (unseen.length) await db.update(userWarnings).set({ seenAt: new Date() }).where(and(eq(userWarnings.userId, userId), inArray(userWarnings.id, unseen)));
  return rows.map((r) => ({ ...r, isNew: !r.seenAt, reasonLabel: WARNING_REASON_LABEL[r.reason] }));
}

/* --------------------------------- Upload --------------------------------- */

/** Højst så mange billeder, der ikke er brugt i en annonce, pr. bruger (mod at bruge lageret som gratis filhotel) */
export const MAX_PENDING_IMAGES = 40;

export async function pendingImageCount(db: Db, ownerId: string): Promise<number> {
  const [r] = await db.select({ n: sql<number>`count(*)::int` }).from(listingImages).where(and(eq(listingImages.ownerId, ownerId), isNull(listingImages.listingId)));
  return r?.n ?? 0;
}

/** Gem et færdigbehandlet billede: først i lageret, derefter rækken (så en række aldrig peger på en manglende fil) */
export async function saveProcessedImage(db: Db, store: ImageStore, ownerId: string, img: { id: string; key: string; main: Buffer; thumb: Buffer; width: number; height: number }) {
  await store.put(img.key, img.main, 'image/webp');
  await store.put(thumbKey(img.key), img.thumb, 'image/webp');
  await db.insert(listingImages).values({ id: img.id, ownerId, storageKey: img.key, contentType: 'image/webp', bytes: img.main.length, width: img.width, height: img.height, scanStatus: 'clean' });
  return { id: img.id, url: store.urlFor(thumbKey(img.key)) };
}
