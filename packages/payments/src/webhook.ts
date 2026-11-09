/**
 * Stripe-webhooks. Sikkerhedsregler:
 *  1. Signaturen verificeres på den RÅ body (+ tidsvindue mod replay) FØR noget læses eller gemmes.
 *  2. Event-id'et er primærnøgle → samme event behandles aldrig to gange (Stripe leverer "mindst én gang").
 *  3. Beløb og valuta på betalingen sammenlignes med ordren – en uoverensstemmelse markerer ordren IKKE som betalt.
 *  4. Fejl returnerer 500, så Stripe prøver igen; et event der fejlede kan genbehandles.
 */
import { and, eq } from 'drizzle-orm';
import type Stripe from 'stripe';
import { schema, type Db } from '@respin/db';
import { applyOrderEvent } from './orders';
import { CURRENCY, accountState, type ConnectedAccountState, type StripeGateway } from './gateway';
import { isPromotionPayment, onPromotionCheckoutCompleted } from './promotions';

const { stripeEvents, orders, outbox, auditLog, sellerProfiles } = schema;
const isOrderSession = (cs: Stripe.Checkout.Session) => cs.metadata?.kind === 'order';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type WebhookOutcome =
  | { status: 'invalid_signature' }
  | { status: 'duplicate'; eventId: string }
  | { status: 'processed' | 'ignored'; eventId: string }
  | { status: 'failed'; eventId: string };

/** HTTP-status der skal returneres til Stripe */
export const httpStatusFor = (o: WebhookOutcome): number => (o.status === 'invalid_signature' ? 400 : o.status === 'failed' ? 500 : 200);

export async function ingestStripeWebhook(db: Db, gw: StripeGateway, input: { rawBody: string; signature: string | null }): Promise<WebhookOutcome> {
  if (!input.signature) return { status: 'invalid_signature' };
  let event: Stripe.Event;
  try { event = gw.verifyWebhook(input.rawBody, input.signature); } catch { return { status: 'invalid_signature' }; }

  const inserted = await db.insert(stripeEvents).values({ id: event.id, type: event.type, livemode: event.livemode, payload: event as unknown as Record<string, unknown> }).onConflictDoNothing().returning({ id: stripeEvents.id });
  if (inserted.length === 0) {
    const [existing] = await db.select({ status: stripeEvents.status }).from(stripeEvents).where(eq(stripeEvents.id, event.id));
    if (existing && (existing.status === 'processed' || existing.status === 'ignored')) return { status: 'duplicate', eventId: event.id };
    // 'received'/'failed' → Stripe sender igen efter en fejl → forsøg igen
  }
  return processStripeEvent(db, event);
}

export class SuspiciousPaymentError extends Error {}

export async function processStripeEvent(db: Db, event: Stripe.Event): Promise<WebhookOutcome> {
  try {
    let outcome: 'processed' | 'ignored' = 'processed';
    switch (event.type) {
      // Betalinger for fremhævning har ingen ordre – de håndteres via checkout.session.completed nedenfor
      case 'payment_intent.succeeded': if (isPromotionPayment(event.data.object)) outcome = 'ignored'; else await onPaymentSucceeded(db, event.data.object); break;
      case 'payment_intent.canceled': if (isPromotionPayment(event.data.object)) outcome = 'ignored'; else await onPaymentCanceled(db, event.data.object); break;
      case 'checkout.session.completed':
        if (isPromotionPayment(event.data.object)) await onPromotionCheckoutCompleted(db, event.data.object);
        else if (isOrderSession(event.data.object)) await onOrderCheckoutCompleted(db, event.data.object);
        else outcome = 'ignored';
        break;
      case 'checkout.session.async_payment_succeeded': if (isOrderSession(event.data.object)) await onOrderCheckoutCompleted(db, event.data.object); else outcome = 'ignored'; break;
      case 'checkout.session.expired': if (isOrderSession(event.data.object)) await onOrderCheckoutExpired(db, event.data.object); else outcome = 'ignored'; break;
      case 'account.updated': await onAccountUpdated(db, event.data.object); break;
      default: outcome = 'ignored';
    }
    await db.update(stripeEvents).set({ status: outcome, processedAt: new Date() }).where(eq(stripeEvents.id, event.id));
    return { status: outcome, eventId: event.id };
  } catch (e) {
    const msg = (e instanceof Error ? e.message : String(e)).slice(0, 500);
    const [row] = await db.select({ attempts: stripeEvents.attempts }).from(stripeEvents).where(eq(stripeEvents.id, event.id));
    await db.update(stripeEvents).set({ status: 'failed', error: msg, attempts: (row?.attempts ?? 0) + 1 }).where(eq(stripeEvents.id, event.id));
    return { status: 'failed', eventId: event.id };
  }
}

async function onPaymentSucceeded(db: Db, pi: Stripe.PaymentIntent): Promise<void> {
  const orderId = pi.metadata?.orderId;
  if (!orderId || !UUID.test(orderId)) throw new SuspiciousPaymentError(`PaymentIntent ${pi.id} mangler gyldigt orderId`);
  const [order] = await db.select().from(orders).where(eq(orders.id, orderId));
  if (!order) throw new SuspiciousPaymentError(`Ordre ${orderId} findes ikke`);

  // Betalingen skal passe PRÆCIS til ordren: samme PaymentIntent, beløb og valuta
  const received = pi.amount_received;
  // Ved Stripe Checkout kendes PaymentIntent først ved betaling; ordren er bundet via metadata (sat af serveren, signeret webhook)
  const samePi = order.stripePaymentIntentId === pi.id || (order.stripePaymentIntentId === null && pi.metadata?.kind === 'order');
  if (!samePi || received !== order.buyerTotalOre || pi.currency !== CURRENCY) {
    await db.insert(auditLog).values({ actorType: 'system', action: 'payment.mismatch', targetType: 'order', targetId: order.id, metadata: { paymentIntent: pi.id, expected: order.buyerTotalOre, received, currency: pi.currency } });
    throw new SuspiciousPaymentError(`Betaling matcher ikke ordre ${order.id}`);
  }

  // Betaling efter at ordren er udløbet/annulleret ("sen betaling"): refundér, bogfør intet
  if (order.status === 'expired' || order.status === 'cancelled') {
    await db.insert(outbox).values({ topic: 'stripe.refund', payload: { orderId: order.id, paymentIntentId: pi.id, late: true }, dedupeKey: `late_payment_refund:${pi.id}` }).onConflictDoNothing();
    await db.insert(auditLog).values({ actorType: 'system', action: 'payment.late', targetType: 'order', targetId: order.id, metadata: { paymentIntent: pi.id } });
    return;
  }

  const chargeId = typeof pi.latest_charge === 'string' ? pi.latest_charge : pi.latest_charge?.id ?? null;
  const r = await applyOrderEvent(db, { orderId: order.id, event: 'payment_succeeded', actor: 'system', payment: { paymentIntentId: pi.id, chargeId } });
  // Allerede betalt (eller videre i flowet) = gentaget levering → ikke en fejl
  if (!r.ok && r.reason !== 'invalid_state') throw new Error(`Kunne ikke registrere betaling: ${r.message}`);
}

async function onPaymentCanceled(db: Db, pi: Stripe.PaymentIntent): Promise<void> {
  const orderId = pi.metadata?.orderId;
  if (!orderId || !UUID.test(orderId)) return;
  const r = await applyOrderEvent(db, { orderId, event: 'payment_expired', actor: 'system' });
  if (!r.ok && r.reason !== 'invalid_state' && r.reason !== 'already_terminal') throw new Error(r.message);
}

/** Betalingssiden er gennemført: gem leveringsadresse og PaymentIntent; er betalingen gennemført, registreres den (idempotent) */
async function onOrderCheckoutCompleted(db: Db, cs: Stripe.Checkout.Session): Promise<void> {
  const orderId = cs.metadata?.orderId;
  if (!orderId || !UUID.test(orderId)) throw new SuspiciousPaymentError(`Checkout ${cs.id} mangler gyldigt orderId`);
  const [order] = await db.select().from(orders).where(eq(orders.id, orderId));
  if (!order) throw new SuspiciousPaymentError(`Ordre ${orderId} findes ikke`);
  if (order.stripeCheckoutSessionId !== cs.id || cs.amount_total !== order.buyerTotalOre || cs.currency !== CURRENCY) {
    await db.insert(auditLog).values({ actorType: 'system', action: 'payment.mismatch', targetType: 'order', targetId: order.id, metadata: { session: cs.id, expected: order.buyerTotalOre, received: cs.amount_total, currency: cs.currency } });
    throw new SuspiciousPaymentError(`Checkout matcher ikke ordre ${order.id}`);
  }
  const ship = cs.collected_information?.shipping_details;
  const piId = typeof cs.payment_intent === 'string' ? cs.payment_intent : cs.payment_intent?.id ?? null;
  await db.update(orders).set({
    ...(ship?.address ? { shippingAddress: { name: ship.name, line1: ship.address.line1 ?? '', line2: ship.address.line2, postalCode: ship.address.postal_code ?? '', city: ship.address.city ?? '', country: ship.address.country ?? 'DK', phone: cs.customer_details?.phone ?? null } } : {}),
    ...(piId && !order.stripePaymentIntentId ? { stripePaymentIntentId: piId } : {}),
    updatedAt: new Date()
  }).where(eq(orders.id, order.id));
  if (cs.payment_status !== 'paid' || !piId) return; // fx bankoverførsel – betalingen kommer senere (async_payment_succeeded)
  if (order.status === 'expired' || order.status === 'cancelled') {
    await db.insert(outbox).values({ topic: 'stripe.refund', payload: { orderId: order.id, paymentIntentId: piId, late: true }, dedupeKey: `late_payment_refund:${piId}` }).onConflictDoNothing();
    await db.insert(auditLog).values({ actorType: 'system', action: 'payment.late', targetType: 'order', targetId: order.id, metadata: { paymentIntent: piId } });
    return;
  }
  const r = await applyOrderEvent(db, { orderId: order.id, event: 'payment_succeeded', actor: 'system', payment: { paymentIntentId: piId } });
  if (!r.ok && r.reason !== 'invalid_state') throw new Error(`Kunne ikke registrere betaling: ${r.message}`);
}

async function onOrderCheckoutExpired(db: Db, cs: Stripe.Checkout.Session): Promise<void> {
  const orderId = cs.metadata?.orderId;
  if (!orderId || !UUID.test(orderId)) return;
  const r = await applyOrderEvent(db, { orderId, event: 'payment_expired', actor: 'system' });
  if (!r.ok && r.reason !== 'invalid_state' && r.reason !== 'already_terminal' && r.reason !== 'not_found') throw new Error(r.message);
}

/**
 * Sælgerens udbetalingskonto er ændret hos Stripe (ID-kontrol godkendt, mangler oplysninger, begrænset …).
 * Gemmer kun status – aldrig persondata. Bliver kontoen klar, prøves ventende overførsler med det samme.
 */
export async function onAccountUpdated(db: Db, account: Stripe.Account, now = new Date()): Promise<void> {
  await applyAccountState(db, account.id, accountState(account), now);
}

/** Gem status for en udbetalingskonto (fra webhook eller direkte opslag hos Stripe) */
export async function applyAccountState(db: Db, accountId: string, st: ConnectedAccountState, now = new Date()): Promise<void> {
  const updated = await db.update(sellerProfiles).set({
    payoutsEnabled: st.payoutsEnabled, kycStatus: st.kycStatus, stripeRequirements: st.requirements, stripeDisabledReason: st.disabledReason, stripeSyncedAt: now
  }).where(eq(sellerProfiles.stripeAccountId, accountId)).returning({ userId: sellerProfiles.userId });
  if (st.payoutsEnabled && updated[0]) {
    const pending = await db.select({ id: orders.id }).from(orders).where(and(eq(orders.sellerId, updated[0].userId), eq(orders.status, 'completed')));
    for (const o of pending) await db.update(outbox).set({ runAfter: now }).where(and(eq(outbox.dedupeKey, `transfer:${o.id}`), eq(outbox.status, 'pending')));
  }
}
