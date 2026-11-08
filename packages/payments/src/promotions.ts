/**
 * Betaling for fremhævning (Stripe Checkout). Aktiveres KUN af en verificeret webhook, og kun når
 * session, beløb og valuta passer præcist til den fremhævning, der blev oprettet. Samme event to gange → ingen ændring.
 */
import { and, desc, eq, gt } from 'drizzle-orm';
import type Stripe from 'stripe';
import { schema, type Db } from '@respin/db';
import { promotionPackage, promotionPeriod } from '@respin/core';
import { CURRENCY } from './gateway';

const { listingPromotions, auditLog } = schema;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class PromotionPaymentError extends Error {}

export const isPromotionPayment = (obj: { metadata?: Stripe.Metadata | null } | null | undefined) => obj?.metadata?.kind === 'promotion';

/** Gør en betalt fremhævning aktiv. Starter nu eller efter en fremhævning, der allerede kører (på annoncen / profilen). */
export async function activatePromotion(db: Db, promotionId: string, now = new Date()): Promise<{ startsAt: Date; endsAt: Date } | null> {
  return db.transaction(async (tx) => {
    const [p] = await tx.select().from(listingPromotions).where(eq(listingPromotions.id, promotionId)).for('update');
    if (!p) throw new PromotionPaymentError(`Fremhævning ${promotionId} findes ikke`);
    if (p.status === 'paid') return null; // allerede aktiveret (Stripe sender "mindst én gang")
    if (p.status !== 'pending') throw new PromotionPaymentError(`Fremhævning ${promotionId} er ${p.status}`);
    const pkg = promotionPackage(p.package, p.kind);
    if (!pkg) throw new PromotionPaymentError(`Ukendt pakke ${p.package}`);
    const [latest] = await tx.select({ endsAt: listingPromotions.endsAt }).from(listingPromotions)
      .where(and(
        p.kind === 'profile' ? and(eq(listingPromotions.kind, 'profile'), eq(listingPromotions.sellerId, p.sellerId)) : eq(listingPromotions.listingId, p.listingId!),
        eq(listingPromotions.status, 'paid'), gt(listingPromotions.endsAt, now)))
      .orderBy(desc(listingPromotions.endsAt)).limit(1);
    const period = promotionPeriod(pkg.days, now, latest?.endsAt);
    await tx.update(listingPromotions).set({ status: 'paid', ...period }).where(and(eq(listingPromotions.id, p.id), eq(listingPromotions.status, 'pending')));
    return period;
  });
}

export async function onPromotionCheckoutCompleted(db: Db, cs: Stripe.Checkout.Session, now = new Date()): Promise<void> {
  const promotionId = cs.metadata?.promotionId;
  if (!promotionId || !UUID.test(promotionId)) throw new PromotionPaymentError(`Checkout ${cs.id} mangler gyldigt promotionId`);
  const [p] = await db.select().from(listingPromotions).where(eq(listingPromotions.id, promotionId));
  if (!p) throw new PromotionPaymentError(`Fremhævning ${promotionId} findes ikke`);
  if (p.status === 'paid') return;
  if (cs.payment_status !== 'paid' || p.stripeSessionId !== cs.id || cs.amount_total !== p.priceOre || cs.currency !== CURRENCY) {
    await db.insert(auditLog).values({ actorType: 'system', action: 'promotion.payment_mismatch', targetType: 'listing_promotion', targetId: p.id,
      metadata: { session: cs.id, expected: p.priceOre, received: cs.amount_total, currency: cs.currency, paymentStatus: cs.payment_status } });
    throw new PromotionPaymentError(`Betaling matcher ikke fremhævning ${p.id}`);
  }
  await activatePromotion(db, p.id, now);
  await db.insert(auditLog).values({ actorType: 'system', action: 'promotion.paid', targetType: 'listing_promotion', targetId: p.id, metadata: { session: cs.id, amount: cs.amount_total } });
}
