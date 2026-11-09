/**
 * Ordre-flowet. Alt der ændrer en ordre går gennem `applyOrderEvent` (tilstandsmaskine + ejerskabstjek +
 * bogholderi + outbox i ÉN databasetransaktion). Beløb bestemmes af serveren – aldrig af klienten.
 */
import { and, eq, lte, sql } from 'drizzle-orm';
import { schema, type Db } from '@respin/db';
import {
  ASSUME_DELIVERED_DAYS, AUTO_COMPLETE_AFTER_HOURS, PAYMENT_WINDOW_MINUTES, SHIP_DEADLINE_DAYS, SHIPPING_PRICE_ORE, computeOrderAmounts, ledger, ore, transition,
  type Actor, type OrderAmounts, type OrderEvent, type OrderStatus
} from '@respin/core';
import type { StripeGateway } from './gateway';

const { orders, orderEvents, listings, ledgerTransactions, ledgerEntries, outbox, sellerProfiles, users } = schema;
type Tx = Parameters<Parameters<Db['transaction']>[0]>[0];

const addMs = (d: Date, ms: number) => new Date(d.getTime() + ms);
const HOUR = 3_600_000;

export const amountsOf = (o: typeof orders.$inferSelect): OrderAmounts => ({
  price: ore(o.priceOre), buyerFee: ore(o.buyerFeeOre), sellerFee: ore(o.sellerFeeOre), shipping: ore(o.shippingOre),
  buyerTotal: ore(o.buyerTotalOre), sellerPayout: ore(o.sellerPayoutOre)
});

/** Bogfør én pengebevægelse præcis én gang (idempotensnøgle). Returnerer false hvis den allerede er bogført. */
export async function postLedger(tx: Tx, orderId: string | null, kind: string, key: string, lines: ledger.LedgerLine[]): Promise<boolean> {
  ledger.assertBalanced(lines); // fejler i koden først; databasen er sidste forsvar
  const [t] = await tx.insert(ledgerTransactions).values({ orderId, kind, idempotencyKey: key }).onConflictDoNothing().returning();
  if (!t) return false;
  await tx.insert(ledgerEntries).values(lines.map((l) => ({ transactionId: t.id, account: l.account, direction: l.direction, amountOre: l.amount })));
  return true;
}

export type CheckoutResult =
  | { ok: true; orderId: string; clientSecret: string; amounts: OrderAmounts }
  | { ok: false; reason: 'listing_unavailable' | 'own_listing' | 'seller_unavailable' };

type Reserved = { ok: true; order: typeof orders.$inferSelect; title: string } | { ok: false; reason: 'listing_unavailable' | 'own_listing' | 'seller_unavailable' };

/** Reservér varen og opret en ubetalt ordre med fastfrosne beløb (én transaktion; kun én aktiv ordre pr. annonce) */
async function reserveOrder(db: Db, input: { buyerId: string; listingId: string; now?: Date }): Promise<Reserved> {
  const now = input.now ?? new Date();
  let title = '';
  type Created = { order: typeof orders.$inferSelect } | { fail: 'listing_unavailable' | 'own_listing' | 'seller_unavailable' };
  let created: Created;
  try {
    created = await db.transaction(async (tx): Promise<Created> => {
      const [l] = await tx.select().from(listings).where(eq(listings.id, input.listingId)).for('update');
      if (!l || l.status !== 'active' || l.moderationStatus !== 'approved') return { fail: 'listing_unavailable' };
      if (l.sellerId === input.buyerId) return { fail: 'own_listing' };
      title = l.title;
      const [seller] = await tx.select({ status: users.status, certified: sellerProfiles.certified }).from(users).leftJoin(sellerProfiles, eq(sellerProfiles.userId, users.id)).where(eq(users.id, l.sellerId));
      if (!seller || seller.status !== 'active') return { fail: 'seller_unavailable' };
      const amounts = computeOrderAmounts({ price: ore(l.priceOre), shipping: SHIPPING_PRICE_ORE[l.shippingSize], sellerCertified: seller.certified === true });
      const [order] = await tx.insert(orders).values({
        listingId: l.id, buyerId: input.buyerId, sellerId: l.sellerId,
        priceOre: amounts.price, buyerFeeOre: amounts.buyerFee, sellerFeeOre: amounts.sellerFee, shippingOre: amounts.shipping,
        buyerTotalOre: amounts.buyerTotal, sellerPayoutOre: amounts.sellerPayout, sellerCertifiedAtOrder: seller.certified === true,
        paymentExpiresAt: addMs(now, PAYMENT_WINDOW_MINUTES * 60_000)
      }).returning();
      await tx.update(listings).set({ status: 'reserved', updatedAt: now }).where(eq(listings.id, l.id));
      return { order: order! };
    });
  } catch (e) {
    if (/orders_one_active_per_listing/.test(`${(e as Error).message} ${(e as { cause?: Error }).cause?.message ?? ''}`)) return { ok: false, reason: 'listing_unavailable' };
    throw e;
  }
  if ('fail' in created) return { ok: false, reason: created.fail };
  return { ok: true, order: created.order, title };
}

export async function createCheckout(db: Db, gw: StripeGateway, input: { buyerId: string; listingId: string; now?: Date }): Promise<CheckoutResult> {
  const now = input.now ?? new Date();
  const r = await reserveOrder(db, input);
  if (!r.ok) return r;
  const { order } = r;
  try {
    // Stripe-kaldet ligger UDEN for databasetransaktionen. Idempotensnøglen gør et gentaget kald ufarligt.
    const pi = await gw.createPaymentIntent({ amount: order.buyerTotalOre, orderId: order.id, idempotencyKey: `pi:${order.id}` });
    await db.update(orders).set({ stripePaymentIntentId: pi.id, updatedAt: now }).where(eq(orders.id, order.id));
    return { ok: true, orderId: order.id, clientSecret: pi.clientSecret, amounts: amountsOf(order) };
  } catch (e) {
    await applyOrderEvent(db, { orderId: order.id, event: 'payment_expired', actor: 'system', now }); // frigiv varen igen
    throw e;
  }
}

export type OrderCheckoutResult =
  | { ok: true; orderId: string; checkoutUrl: string }
  | { ok: true; orderId: string; simulated: true }
  | { ok: false; reason: 'listing_unavailable' | 'own_listing' | 'seller_unavailable' | 'payments_unavailable' };

/**
 * Køb nu → Stripe Checkout (hostet betalingsside: kort, MobilePay m.m.; Stripe indsamler leveringsadressen).
 * Har køberen allerede en ubetalt ordre på varen (fx gik tilbage fra betalingssiden), annulleres den først.
 * Uden Stripe (kun udvikling/test) kan betalingen simuleres med `simulate`.
 */
export async function startOrderCheckout(db: Db, gw: StripeGateway | null, input: {
  buyerId: string; buyerEmail: string; listingId: string; appUrl: string; simulate?: boolean; now?: Date;
}): Promise<OrderCheckoutResult> {
  const now = input.now ?? new Date();
  if (!gw && !input.simulate) return { ok: false, reason: 'payments_unavailable' };
  const [stale] = await db.select({ id: orders.id, session: orders.stripeCheckoutSessionId }).from(orders)
    .where(and(eq(orders.listingId, input.listingId), eq(orders.buyerId, input.buyerId), eq(orders.status, 'pending_payment')));
  if (stale) {
    if (stale.session && gw) await gw.expireCheckoutSession(stale.session);
    await applyOrderEvent(db, { orderId: stale.id, event: 'buyer_cancel', actor: 'buyer', actorId: input.buyerId, now });
  }
  const r = await reserveOrder(db, { buyerId: input.buyerId, listingId: input.listingId, now });
  if (!r.ok) return r;
  const { order, title } = r;
  if (!gw) {
    const done = await applyOrderEvent(db, { orderId: order.id, event: 'payment_succeeded', actor: 'system', now, payment: { paymentIntentId: `pi_sim_${order.id}` }, metadata: { simulated: true } });
    if (!done.ok) throw new Error(done.message);
    return { ok: true, orderId: order.id, simulated: true };
  }
  const base = input.appUrl.replace(/\/+$/, '');
  try {
    const cs = await gw.createOrderCheckoutSession({
      orderId: order.id, customerEmail: input.buyerEmail, idempotencyKey: `checkout:${order.id}`,
      lines: [
        { name: title, amountOre: order.priceOre },
        { name: 'Køberbeskyttelse (5 % + 3 kr.)', amountOre: order.buyerFeeOre },
        { name: 'Fragt', amountOre: order.shippingOre }
      ],
      successUrl: `${base}/konto/ordrer/${order.id}/?betalt=1`, cancelUrl: `${base}/annonce/${order.listingId}/?betaling=annulleret`
    });
    await db.update(orders).set({ stripeCheckoutSessionId: cs.id, updatedAt: now }).where(eq(orders.id, order.id));
    return { ok: true, orderId: order.id, checkoutUrl: cs.url };
  } catch (e) {
    await applyOrderEvent(db, { orderId: order.id, event: 'payment_expired', actor: 'system', now }); // frigiv varen igen
    throw e;
  }
}

export interface ApplyEventInput {
  orderId: string;
  event: OrderEvent;
  actor: Actor;
  /** Brugerens/medarbejderens id. PÅKRÆVET for buyer/seller/admin – verificeres mod ordren (forhindrer IDOR). */
  actorId?: string | null;
  now?: Date;
  /** Kun for payment_succeeded */
  payment?: { paymentIntentId: string; chargeId?: string | null };
  /** Kun for seller_ship: fragtfirma og sporingsnummer (valgfrit) */
  shipment?: { carrier?: string | null; trackingNumber?: string | null };
  metadata?: Record<string, unknown>;
}

export type ApplyEventResult =
  | { ok: true; from: OrderStatus; to: OrderStatus }
  | { ok: false; reason: 'not_found' | 'invalid_state' | 'forbidden_actor' | 'already_terminal'; message: string };

export class ConcurrencyError extends Error {}

export async function applyOrderEvent(db: Db, input: ApplyEventInput): Promise<ApplyEventResult> {
  const now = input.now ?? new Date();
  return db.transaction(async (tx): Promise<ApplyEventResult> => {
    const [order] = await tx.select().from(orders).where(eq(orders.id, input.orderId)).for('update');
    // Samme svar for "findes ikke" og "ikke din" → ingen enumerering af andres ordrer
    if (!order) return { ok: false, reason: 'not_found', message: 'Ordren findes ikke' };
    const owns = input.actor === 'system' || (!!input.actorId && ((input.actor === 'buyer' && input.actorId === order.buyerId) || (input.actor === 'seller' && input.actorId === order.sellerId) || input.actor === 'admin'));
    if (!owns) return { ok: false, reason: 'not_found', message: 'Ordren findes ikke' };

    const t = transition(order.status, input.event, input.actor);
    if (!t.ok) return { ok: false, reason: t.reason, message: t.message };

    const patch: Partial<typeof orders.$inferInsert> = { status: t.to, version: order.version + 1, updatedAt: now };
    if (t.to === 'paid') { patch.shipByAt = addMs(now, SHIP_DEADLINE_DAYS * 24 * HOUR); patch.stripePaymentIntentId = input.payment?.paymentIntentId ?? order.stripePaymentIntentId; patch.stripeChargeId = input.payment?.chargeId ?? null; }
    if (t.to === 'shipped') { patch.shippedAt = now; patch.carrier = input.shipment?.carrier?.slice(0, 40) || null; patch.trackingNumber = input.shipment?.trackingNumber?.slice(0, 60) || null; }
    if (t.to === 'delivered') { patch.deliveredAt = now; patch.autoCompleteAt = addMs(now, AUTO_COMPLETE_AFTER_HOURS * HOUR); }
    const updated = await tx.update(orders).set(patch).where(and(eq(orders.id, order.id), eq(orders.version, order.version))).returning({ id: orders.id });
    if (updated.length !== 1) throw new ConcurrencyError(`Samtidig ændring af ordre ${order.id}`);

    await tx.insert(orderEvents).values({ orderId: order.id, event: input.event, fromStatus: t.from, toStatus: t.to, actorType: input.actor, actorId: input.actorId ?? null, metadata: input.metadata ?? {} });

    const amounts = amountsOf(order);
    if (t.effect === 'hold_funds') {
      await postLedger(tx, order.id, 'payment_captured', `payment_captured:${order.id}`, ledger.paymentCaptured(order.id, amounts));
      await tx.update(listings).set({ status: 'sold', updatedAt: now }).where(eq(listings.id, order.listingId));
    } else if (t.effect === 'release_to_seller') {
      await postLedger(tx, order.id, 'funds_released', `funds_released:${order.id}`, ledger.fundsReleased(order.id, order.sellerId, amounts));
      await tx.insert(outbox).values({ topic: 'stripe.transfer', payload: { orderId: order.id }, dedupeKey: `transfer:${order.id}` }).onConflictDoNothing();
    } else if (t.effect === 'refund_buyer') {
      await postLedger(tx, order.id, 'buyer_refunded', `buyer_refunded:${order.id}`, ledger.buyerRefunded(order.id, amounts));
      await tx.insert(outbox).values({ topic: 'stripe.refund', payload: { orderId: order.id }, dedupeKey: `refund:${order.id}` }).onConflictDoNothing();
    }
    // Ordren blev aldrig betalt/gennemført → varen kan sælges igen
    if (['expired', 'cancelled', 'refunded'].includes(t.to)) await tx.update(listings).set({ status: 'active', updatedAt: now }).where(and(eq(listings.id, order.listingId), sql`${listings.status} IN ('reserved','sold')`));
    return { ok: true, from: t.from, to: t.to };
  });
}

export interface TimerResult { expired: number; shipTimeouts: number; assumedDelivered: number; autoCompleted: number; failed: number }

/**
 * Ordrernes frister (køres af cron): ubetalte ordrer udløber, ikke-afsendte refunderes, afsendte regnes for leveret
 * efter ASSUME_DELIVERED_DAYS, og leverede frigives automatisk efter 48 timer. Alt går gennem tilstandsmaskinen.
 */
export async function runOrderTimers(db: Db, now = new Date(), limit = 100): Promise<TimerResult> {
  const out: TimerResult = { expired: 0, shipTimeouts: 0, assumedDelivered: 0, autoCompleted: 0, failed: 0 };
  // 5 min. respit efter betalingsvinduet, så en betaling, der netop er gennemført, når at komme via webhook
  const grace = new Date(now.getTime() - 5 * 60_000);
  const jobs: { event: OrderEvent; key: keyof TimerResult; where: ReturnType<typeof and> }[] = [
    { event: 'payment_expired', key: 'expired', where: and(eq(orders.status, 'pending_payment'), lte(orders.paymentExpiresAt, grace)) },
    { event: 'ship_timeout', key: 'shipTimeouts', where: and(eq(orders.status, 'paid'), lte(orders.shipByAt, now)) },
    { event: 'carrier_delivered', key: 'assumedDelivered', where: and(eq(orders.status, 'shipped'), lte(orders.shippedAt, addMs(now, -ASSUME_DELIVERED_DAYS * 24 * HOUR))) },
    { event: 'auto_complete', key: 'autoCompleted', where: and(eq(orders.status, 'delivered'), lte(orders.autoCompleteAt, now)) }
  ];
  for (const j of jobs) {
    const due = await db.select({ id: orders.id }).from(orders).where(j.where).limit(limit);
    for (const o of due) {
      try {
        const r = await applyOrderEvent(db, { orderId: o.id, event: j.event, actor: 'system', now, metadata: { timer: true } });
        if (r.ok) out[j.key]++;
      } catch { out.failed++; }
    }
  }
  return out;
}
