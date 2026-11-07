import 'server-only';
import { and, eq, gt, inArray } from 'drizzle-orm';
import { schema, type Db } from '@respin/db';
import { promotionPackage } from '@respin/core';
import { activatePromotion, type StripeGateway } from '@respin/payments';

const { listings, listingPromotions } = schema;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export type PromoteError = 'invalid_package' | 'not_found' | 'not_active' | 'payments_unavailable';
export type PromoteResult = { ok: true; checkoutUrl: string } | { ok: true; activated: true } | { ok: false; error: PromoteError };

/**
 * Køb fremhævning af EGEN annonce. Opretter en afventende fremhævning (pris fastfrosset fra pakken – aldrig fra
 * klienten) og sender til Stripe Checkout. Aktiveres først, når Stripe har bekræftet betalingen (webhook).
 * Uden Stripe (udvikling/test) kan den aktiveres med det samme, hvis `allowTestActivation` er sat.
 */
export async function startPromotion(db: Db, sellerId: string, listingId: string, packageId: string, deps: {
  gateway: StripeGateway | null; appUrl: string; allowTestActivation: boolean; now?: Date;
}): Promise<PromoteResult> {
  const pkg = promotionPackage(packageId);
  if (!pkg) return { ok: false, error: 'invalid_package' };
  if (!UUID.test(listingId)) return { ok: false, error: 'not_found' };
  const [l] = await db.select({ id: listings.id, title: listings.title, status: listings.status, moderation: listings.moderationStatus })
    .from(listings).where(and(eq(listings.id, listingId), eq(listings.sellerId, sellerId)));
  if (!l) return { ok: false, error: 'not_found' };
  if (l.status !== 'active' || l.moderation !== 'approved') return { ok: false, error: 'not_active' };
  if (!deps.gateway && !deps.allowTestActivation) return { ok: false, error: 'payments_unavailable' };

  const [p] = await db.insert(listingPromotions).values({ listingId: l.id, sellerId, package: pkg.id, priceOre: pkg.priceOre }).returning({ id: listingPromotions.id });
  if (!deps.gateway) {
    await activatePromotion(db, p!.id, deps.now);
    return { ok: true, activated: true };
  }
  const base = deps.appUrl.replace(/\/+$/, '');
  const session = await deps.gateway.createCheckoutSession({
    amountOre: pkg.priceOre, productName: `Fremhævning i ${pkg.label}: ${l.title}`.slice(0, 120), promotionId: p!.id,
    successUrl: `${base}/konto/annoncer/?fremhaevet=1`, cancelUrl: `${base}/konto/annoncer/${l.id}/fremhaev/?annulleret=1`,
    idempotencyKey: `promotion:${p!.id}`
  });
  await db.update(listingPromotions).set({ stripeSessionId: session.id }).where(eq(listingPromotions.id, p!.id));
  return { ok: true, checkoutUrl: session.url };
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
  for (const r of rows) if (active.has(r.listingId) && (!m.has(r.listingId) || m.get(r.listingId)! < r.endsAt!)) m.set(r.listingId, r.endsAt!);
  return m;
}
