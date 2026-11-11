import 'server-only';
import { and, desc, eq, gt, inArray, lte, sql } from 'drizzle-orm';
import { schema, type Db } from '@respin/db';
import { promotionPackage, promotionPrice } from '@respin/core';
import { activatePromotion, type StripeGateway } from '@respin/payments';
import { thumbKey, type ImageStore } from './image-store';

const { listings, listingImages, listingPromotions, sellerProfiles, users } = schema;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export type PromoteError = 'invalid_package' | 'not_found' | 'not_active' | 'no_listings' | 'payments_unavailable';
type Deps = { gateway: StripeGateway | null; appUrl: string; allowTestActivation: boolean; now?: Date };

/** Certificerede sælgere får fremhævning billigere */
export async function isCertified(db: Db, userId: string): Promise<boolean> {
  const [p] = await db.select({ certified: sellerProfiles.certified }).from(sellerProfiles).where(eq(sellerProfiles.userId, userId));
  return p?.certified === true;
}
export type PromoteResult = { ok: true; checkoutUrl: string } | { ok: true; activated: true } | { ok: false; error: PromoteError };

/**
 * Køb fremhævning af EGEN annonce. Opretter en afventende fremhævning (pris fastfrosset fra pakken – aldrig fra
 * klienten) og sender til Stripe Checkout. Aktiveres først, når Stripe har bekræftet betalingen (webhook).
 * Uden Stripe (udvikling/test) kan den aktiveres med det samme, hvis `allowTestActivation` er sat.
 */
export async function startPromotion(db: Db, sellerId: string, listingId: string, packageId: string, deps: Deps): Promise<PromoteResult> {
  const pkg = promotionPackage(packageId);
  if (!pkg) return { ok: false, error: 'invalid_package' };
  if (!UUID.test(listingId)) return { ok: false, error: 'not_found' };
  const [l] = await db.select({ id: listings.id, title: listings.title, status: listings.status, moderation: listings.moderationStatus })
    .from(listings).where(and(eq(listings.id, listingId), eq(listings.sellerId, sellerId)));
  if (!l) return { ok: false, error: 'not_found' };
  if (l.status !== 'active' || l.moderation !== 'approved') return { ok: false, error: 'not_active' };
  if (!deps.gateway && !deps.allowTestActivation) return { ok: false, error: 'payments_unavailable' };

  const priceOre = promotionPrice(pkg, await isCertified(db, sellerId));
  const [p] = await db.insert(listingPromotions).values({ kind: 'listing', listingId: l.id, sellerId, package: pkg.id, priceOre }).returning({ id: listingPromotions.id });
  return checkout(db, p!.id, priceOre, `Fremhævning i ${pkg.label}: ${l.title}`, '/konto/annoncer/?fremhaevet=1', `/konto/annoncer/${l.id}/fremhaev/?annulleret=1`, deps);
}

/**
 * Køb fremhævning af EGEN profil: sælgeren vises under «Fremhævede sælgere» på forsiden. Kræver mindst én aktiv,
 * godkendt annonce (ellers er der intet at vise frem).
 */
export async function startProfilePromotion(db: Db, userId: string, packageId: string, deps: Deps): Promise<PromoteResult> {
  const pkg = promotionPackage(packageId, 'profile');
  if (!pkg) return { ok: false, error: 'invalid_package' };
  const [u] = await db.select({ status: users.status }).from(users).where(eq(users.id, userId));
  if (!u || u.status !== 'active') return { ok: false, error: 'not_found' };
  const [n] = await db.select({ n: sql<number>`count(*)`.mapWith(Number) }).from(listings)
    .where(and(eq(listings.sellerId, userId), eq(listings.status, 'active'), eq(listings.moderationStatus, 'approved')));
  if (!n?.n) return { ok: false, error: 'no_listings' };
  if (!deps.gateway && !deps.allowTestActivation) return { ok: false, error: 'payments_unavailable' };
  const priceOre = promotionPrice(pkg, await isCertified(db, userId));
  const [p] = await db.insert(listingPromotions).values({ kind: 'profile', listingId: null, sellerId: userId, package: pkg.id, priceOre }).returning({ id: listingPromotions.id });
  return checkout(db, p!.id, priceOre, `Fremhævet profil i ${pkg.label}`, '/konto/?profil_fremhaevet=1', '/konto/fremhaev-profil/?annulleret=1', deps);
}

/** Uden Stripe (test): aktivér med det samme. Ellers Stripe Checkout – aktiveres først af den verificerede webhook. */
async function checkout(db: Db, promotionId: string, amountOre: number, productName: string, success: string, cancel: string, deps: Deps): Promise<PromoteResult> {
  if (!deps.gateway) {
    await activatePromotion(db, promotionId, deps.now);
    return { ok: true, activated: true };
  }
  const base = deps.appUrl.replace(/\/+$/, '');
  const session = await deps.gateway.createCheckoutSession({
    amountOre, productName: productName.slice(0, 120), promotionId,
    successUrl: `${base}${success}`, cancelUrl: `${base}${cancel}`, idempotencyKey: `promotion:${promotionId}`
  });
  await db.update(listingPromotions).set({ stripeSessionId: session.id }).where(eq(listingPromotions.id, promotionId));
  return { ok: true, checkoutUrl: session.url };
}

/** Slutdato for brugerens aktive profilfremhævning (null = ikke fremhævet nu) */
export async function activeProfilePromotion(db: Db, userId: string, now = new Date()): Promise<Date | null> {
  const rows = await db.select({ startsAt: listingPromotions.startsAt, endsAt: listingPromotions.endsAt }).from(listingPromotions)
    .where(and(eq(listingPromotions.kind, 'profile'), eq(listingPromotions.sellerId, userId), eq(listingPromotions.status, 'paid'), gt(listingPromotions.endsAt, now)))
    .orderBy(desc(listingPromotions.endsAt));
  return rows.some((r) => r.startsAt! <= now) ? rows[0]!.endsAt : null;
}

export interface PromotedSeller { id: string; name: string; username: string | null; certified: boolean; count: number; images: string[]; avatar: string | null }

/**
 * Fremhævede sælgere til forsiden: aktiv profilfremhævning, aktiv konto og mindst én vare til salg.
 * Rækkefølgen blandes, så alle betalende får en fair plads.
 */
export async function promotedSellers(db: Db, store: ImageStore, limit = 4, now = new Date()): Promise<PromotedSeller[]> {
  const live = and(eq(listings.status, 'active'), eq(listings.moderationStatus, 'approved'));
  const rows = await db.selectDistinct({ id: users.id, name: users.displayName, username: users.username, avatarKey: users.avatarKey, certified: sql<boolean>`coalesce(${sellerProfiles.certified}, false)` })
    .from(listingPromotions).innerJoin(users, eq(users.id, listingPromotions.sellerId)).leftJoin(sellerProfiles, eq(sellerProfiles.userId, users.id))
    .where(and(eq(listingPromotions.kind, 'profile'), eq(listingPromotions.status, 'paid'), lte(listingPromotions.startsAt, now), gt(listingPromotions.endsAt, now), eq(users.status, 'active')));
  const picked = rows.sort(() => Math.random() - 0.5).slice(0, limit * 2);
  if (!picked.length) return [];
  const items = await db.select({ sellerId: listings.sellerId, createdAt: listings.createdAt,
    cover: sql<string | null>`(select storage_key from ${listingImages} li where li.listing_id = listings.id order by li.position limit 1)` })
    .from(listings).where(and(live, inArray(listings.sellerId, picked.map((r) => r.id)))).orderBy(desc(listings.createdAt)).limit(500);
  return picked.map((r) => {
    const own = items.filter((i) => i.sellerId === r.id);
    const { avatarKey, ...rest } = r;
    return { ...rest, avatar: avatarKey ? store.urlFor(avatarKey) : null, certified: !!r.certified, count: own.length, images: own.filter((i) => i.cover).slice(0, 3).map((i) => store.urlFor(thumbKey(i.cover!))) };
  }).filter((s) => s.count > 0).slice(0, limit);
}

/**
 * Aktive fremhævninger: annonce-id → slutdato. Er flere køb lagt i forlængelse af hinanden, vises den
 * samlede slutdato (den seneste betalte, der ikke er udløbet).
 */
export async function activePromotions(db: Db, listingIds: string[], now = new Date()): Promise<Map<string, Date>> {
  if (!listingIds.length) return new Map();
  const rows = await db.select({ listingId: listingPromotions.listingId, startsAt: listingPromotions.startsAt, endsAt: listingPromotions.endsAt }).from(listingPromotions)
    .where(and(inArray(listingPromotions.listingId, listingIds), eq(listingPromotions.status, 'paid'), gt(listingPromotions.endsAt, now)));
  const active = new Set(rows.filter((r) => r.startsAt! <= now).map((r) => r.listingId));
  const m = new Map<string, Date>();
  for (const r of rows) if (active.has(r.listingId!) && (!m.has(r.listingId!) || m.get(r.listingId!)! < r.endsAt!)) m.set(r.listingId!, r.endsAt!);
  return m;
}
