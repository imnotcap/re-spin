import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import Stripe from 'stripe';
import { schema, type Db } from '@respin/db';
import { createTestDb } from '@respin/db/testing';
import { ASSUME_DELIVERED_DAYS } from '@respin/core';
import { accountState, applyOrderEvent, ingestStripeWebhook, runOrderTimers, runOutbox, startOrderCheckout, stripeGateway, type StripeGateway } from './index';

const s = schema;
const WH = 'whsec_test_connect_secret_1234567890';
const CONNECT_WH = 'whsec_test_connect_endpoint_0987654321';
const realStripe = new Stripe('sk_test_offline');
const verifier = stripeGateway(realStripe, WH, CONNECT_WH);

let db: Db, close: () => Promise<void>;
beforeAll(async () => { ({ db, close } = await createTestDb()); });
afterAll(async () => { await close(); });

function fakeGateway() {
  const calls = { sessions: [] as Parameters<StripeGateway['createOrderCheckoutSession']>[0][], expired: [] as string[], transfer: [] as unknown[], refund: [] as unknown[] };
  const gw: StripeGateway = {
    createPaymentIntent: async () => { throw new Error('ikke brugt'); },
    createTransfer: async (p) => { calls.transfer.push(p); return { id: `tr_${p.orderId}` }; },
    createRefund: async (p) => { calls.refund.push(p); return { id: `re_${calls.refund.length}` }; },
    createCheckoutSession: async () => { throw new Error('ikke brugt'); },
    createConnectedAccount: async () => ({ id: 'acct_x' }),
    createAccountLink: async () => ({ url: 'https://connect.stripe.test/x' }),
    createLoginLink: async () => ({ url: 'https://connect.stripe.test/y' }),
    retrieveAccount: async () => ({ payoutsEnabled: false, detailsSubmitted: false, requirements: [], pastDue: [], disabledReason: null, kycStatus: 'none' }),
    createOrderCheckoutSession: async (p) => { calls.sessions.push(p); return { id: `cs_${p.orderId}`, url: `https://checkout.stripe.com/c/pay/${p.orderId}` }; },
    expireCheckoutSession: async (id) => { calls.expired.push(id); },
    verifyWebhook: (raw, sig) => verifier.verifyWebhook(raw, sig)
  };
  return { gw, calls };
}

let k = 0;
async function market(payoutsReady = false) {
  const i = ++k;
  const mk = async (n: string) => (await db.insert(s.users).values({ email: `${n}${i}@c.dk`, emailNormalized: `${n}${i}@c.dk`, displayName: n }).returning())[0]!;
  const seller = await mk('s'), buyer = await mk('b');
  await db.insert(s.sellerProfiles).values({ userId: seller.id, stripeAccountId: `acct_c${i}`, payoutsEnabled: payoutsReady, kycStatus: payoutsReady ? 'verified' : 'none' });
  const [listing] = await db.insert(s.listings).values({ sellerId: seller.id, title: 'Jakke', category: 'kvinder', condition: 'good', priceOre: 30_000, shippingSize: 'small', status: 'active', moderationStatus: 'approved' }).returning();
  return { seller, buyer, listing: listing!, acct: `acct_c${i}` };
}
const order = async (id: string) => (await db.select().from(s.orders).where(eq(s.orders.id, id)))[0]!;
const listingStatus = async (id: string) => (await db.select().from(s.listings).where(eq(s.listings.id, id)))[0]!.status;
function signed(type: string, object: Record<string, unknown>, secret = WH) {
  const id = `evt_${Math.random().toString(36).slice(2)}`;
  const payload = JSON.stringify({ id, object: 'event', type, livemode: false, data: { object } });
  return { rawBody: payload, signature: realStripe.webhooks.generateTestHeaderString({ payload, secret }) };
}
const session = (o: { id: string; buyerTotalOre: number }, extra: Record<string, unknown> = {}) => ({
  id: `cs_${o.id}`, object: 'checkout.session', amount_total: o.buyerTotalOre, currency: 'dkk', payment_status: 'paid', payment_intent: `pi_${o.id}`,
  metadata: { kind: 'order', orderId: o.id }, customer_details: { phone: '+4512345678' },
  collected_information: { shipping_details: { name: 'Jonas Jensen', address: { line1: 'Nørregade 1', line2: null, postal_code: '1165', city: 'København K', country: 'DK' } } }, ...extra
});
async function checkout(gw: StripeGateway, m: Awaited<ReturnType<typeof market>>) {
  const r = await startOrderCheckout(db, gw, { buyerId: m.buyer.id, buyerEmail: 'b@c.dk', listingId: m.listing.id, appUrl: 'https://videro.dk/' });
  if (!r.ok || !('checkoutUrl' in r)) throw new Error(JSON.stringify(r));
  return r;
}

describe('køb via Stripe Checkout', () => {
  it('betalingssiden får vare, køberbeskyttelse og fragt som linjer, der summerer til ordren; varen reserveres', async () => {
    const { gw, calls } = fakeGateway(); const m = await market();
    const r = await checkout(gw, m);
    const o = await order(r.orderId);
    expect(calls.sessions[0]!.lines.reduce((a, l) => a + l.amountOre, 0)).toBe(o.buyerTotalOre);
    expect(calls.sessions[0]).toMatchObject({ successUrl: `https://videro.dk/konto/ordrer/${o.id}/?betalt=1`, idempotencyKey: `checkout:${o.id}` });
    expect(o).toMatchObject({ status: 'pending_payment', stripeCheckoutSessionId: `cs_${o.id}`, stripePaymentIntentId: null });
    expect(await listingStatus(m.listing.id)).toBe('reserved');
  });

  it('køber prøver igen: den gamle session udløber og ordren annulleres – kun én aktiv ordre', async () => {
    const { gw, calls } = fakeGateway(); const m = await market();
    const first = await checkout(gw, m); const second = await checkout(gw, m);
    expect(calls.expired).toEqual([`cs_${first.orderId}`]);
    expect((await order(first.orderId)).status).toBe('cancelled');
    expect((await order(second.orderId)).status).toBe('pending_payment');
  });

  it('webhook: gennemført betaling gemmer adresse og PaymentIntent og markerer ordren betalt (to gange = samme resultat)', async () => {
    const { gw } = fakeGateway(); const m = await market();
    const o = await order((await checkout(gw, m)).orderId);
    expect(await ingestStripeWebhook(db, gw, signed('checkout.session.completed', session(o)))).toMatchObject({ status: 'processed' });
    const paid = await order(o.id);
    expect(paid).toMatchObject({ status: 'paid', stripePaymentIntentId: `pi_${o.id}`, shippingAddress: { name: 'Jonas Jensen', postalCode: '1165', city: 'København K', phone: '+4512345678' } });
    expect(await listingStatus(m.listing.id)).toBe('sold');
    // payment_intent.succeeded kommer bagefter → ingen fejl, ingen ændring
    const pi = { id: `pi_${o.id}`, object: 'payment_intent', amount_received: o.buyerTotalOre, currency: 'dkk', latest_charge: 'ch_9', metadata: { kind: 'order', orderId: o.id } };
    expect(await ingestStripeWebhook(db, gw, signed('payment_intent.succeeded', pi))).toMatchObject({ status: 'processed' });
    expect((await order(o.id)).status).toBe('paid');
  });

  it('webhook: forkert beløb eller fremmed session markerer IKKE ordren som betalt', async () => {
    const { gw } = fakeGateway(); const m = await market();
    const o = await order((await checkout(gw, m)).orderId);
    expect(await ingestStripeWebhook(db, gw, signed('checkout.session.completed', session(o, { amount_total: 100 })))).toMatchObject({ status: 'failed' });
    expect(await ingestStripeWebhook(db, gw, signed('checkout.session.completed', session(o, { id: 'cs_fremmed' })))).toMatchObject({ status: 'failed' });
    expect((await order(o.id)).status).toBe('pending_payment');
  });

  it('udløbet betalingsside frigiver varen igen', async () => {
    const { gw } = fakeGateway(); const m = await market();
    const o = await order((await checkout(gw, m)).orderId);
    await ingestStripeWebhook(db, gw, signed('checkout.session.expired', session(o, { payment_status: 'unpaid' })));
    expect((await order(o.id)).status).toBe('expired');
    expect(await listingStatus(m.listing.id)).toBe('active');
  });

  it('uden Stripe kan betaling kun simuleres, når det udtrykkeligt er slået til', async () => {
    const m = await market();
    expect(await startOrderCheckout(db, null, { buyerId: m.buyer.id, buyerEmail: 'b@c.dk', listingId: m.listing.id, appUrl: 'x' })).toEqual({ ok: false, reason: 'payments_unavailable' });
    const r = await startOrderCheckout(db, null, { buyerId: m.buyer.id, buyerEmail: 'b@c.dk', listingId: m.listing.id, appUrl: 'x', simulate: true });
    expect(r).toMatchObject({ ok: true, simulated: true });
  });
});

describe('udbetalingskonto og ID-kontrol (Stripe Connect)', () => {
  it('accountState: godkendt kun når payouts er slået til OG transfers er aktiv', () => {
    const base = { details_submitted: true, requirements: { currently_due: [], eventually_due: [], past_due: [], disabled_reason: null } };
    expect(accountState({ ...base, payouts_enabled: true, capabilities: { transfers: 'active' } } as never)).toMatchObject({ payoutsEnabled: true, kycStatus: 'verified' });
    expect(accountState({ ...base, payouts_enabled: true, capabilities: { transfers: 'pending' } } as never)).toMatchObject({ payoutsEnabled: false, kycStatus: 'pending' });
    expect(accountState({ ...base, payouts_enabled: false, capabilities: {}, requirements: { ...base.requirements, disabled_reason: 'rejected.fraud' } } as never)).toMatchObject({ kycStatus: 'rejected' });
  });

  it('account.updated via Connect-webhook gemmer status og mangler; ventende overførsel sendes, når kontoen er godkendt', async () => {
    const { gw, calls } = fakeGateway(); const m = await market(false);
    const o = await order((await checkout(gw, m)).orderId);
    await ingestStripeWebhook(db, gw, signed('checkout.session.completed', session(o)));
    await applyOrderEvent(db, { orderId: o.id, event: 'seller_ship', actor: 'seller', actorId: m.seller.id, shipment: { carrier: 'GLS', trackingNumber: 'ABC123' } });
    expect(await order(o.id)).toMatchObject({ status: 'shipped', carrier: 'GLS', trackingNumber: 'ABC123' });
    await applyOrderEvent(db, { orderId: o.id, event: 'buyer_received', actor: 'buyer', actorId: m.buyer.id });
    await applyOrderEvent(db, { orderId: o.id, event: 'buyer_approve', actor: 'buyer', actorId: m.buyer.id });

    // Sælgeren mangler ID-kontrol: overførslen venter uden at blive opgivet, uanset hvor mange gange den prøves
    for (let i = 0; i < 12; i++) await runOutbox(db, gw, { now: new Date(Date.now() + i * 7 * 3_600_000) });
    const [job] = await db.select().from(s.outbox).where(eq(s.outbox.dedupeKey, `transfer:${o.id}`));
    expect(job).toMatchObject({ status: 'pending', attempts: 0, lastError: 'seller_not_payout_ready' });
    expect(calls.transfer).toHaveLength(0);

    const missing = { id: m.acct, object: 'account', payouts_enabled: false, details_submitted: true, capabilities: { transfers: 'inactive' }, requirements: { currently_due: ['individual.verification.document'], eventually_due: [], past_due: ['individual.verification.document'], disabled_reason: 'requirements.past_due' } };
    expect(await ingestStripeWebhook(db, gw, signed('account.updated', missing, CONNECT_WH))).toMatchObject({ status: 'processed' });
    let [p] = await db.select().from(s.sellerProfiles).where(eq(s.sellerProfiles.userId, m.seller.id));
    expect(p).toMatchObject({ payoutsEnabled: false, kycStatus: 'pending', stripeRequirements: ['individual.verification.document'], stripeDisabledReason: 'requirements.past_due' });

    const ok = { ...missing, payouts_enabled: true, capabilities: { transfers: 'active' }, requirements: { currently_due: [], eventually_due: [], past_due: [], disabled_reason: null } };
    await ingestStripeWebhook(db, gw, signed('account.updated', ok, CONNECT_WH));
    [p] = await db.select().from(s.sellerProfiles).where(eq(s.sellerProfiles.userId, m.seller.id));
    expect(p).toMatchObject({ payoutsEnabled: true, kycStatus: 'verified', stripeRequirements: [] });
    await runOutbox(db, gw);
    expect(calls.transfer).toEqual([expect.objectContaining({ amount: o.sellerPayoutOre, destination: m.acct, idempotencyKey: `transfer:${o.id}` })]);
  });

  it('webhook med ukendt hemmelighed afvises', async () => {
    const { gw } = fakeGateway();
    expect(await ingestStripeWebhook(db, gw, signed('account.updated', { id: 'acct_z' }, 'whsec_forkert_hemmelighed_123456'))).toEqual({ status: 'invalid_signature' });
  });
});

describe('ordrernes frister (cron)', () => {
  it('ikke afsendt → refunderes; afsendt uden svar → regnes for leveret; leveret → frigives efter 48 timer; ubetalt → udløber', async () => {
    const { gw } = fakeGateway();
    const now = Date.now();
    const a = await market(true), b = await market(true), c = await market(true), d = await market(true);
    const paidOrder = async (m: typeof a) => { const o = await order((await checkout(gw, m)).orderId); await ingestStripeWebhook(db, gw, signed('checkout.session.completed', session(o))); return o.id; };
    const notShipped = await paidOrder(a);
    const shipped = await paidOrder(b); await applyOrderEvent(db, { orderId: shipped, event: 'seller_ship', actor: 'seller', actorId: b.seller.id });
    const delivered = await paidOrder(c); await applyOrderEvent(db, { orderId: delivered, event: 'seller_ship', actor: 'seller', actorId: c.seller.id }); await applyOrderEvent(db, { orderId: delivered, event: 'buyer_received', actor: 'buyer', actorId: c.buyer.id });
    const unpaid = (await checkout(gw, d)).orderId;

    const later = new Date(now + (ASSUME_DELIVERED_DAYS + 1) * 86_400_000);
    const r = await runOrderTimers(db, later);
    expect(r.failed).toBe(0);
    expect((await order(notShipped)).status).toBe('refunded');
    expect((await order(shipped)).status).toBe('delivered');
    expect((await order(delivered)).status).toBe('completed');
    expect((await order(unpaid)).status).toBe('expired');
    expect(await listingStatus(a.listing.id)).toBe('active');
    // Den antaget leverede ordre frigives først 48 timer senere
    expect((await runOrderTimers(db, new Date(later.getTime() + 49 * 3_600_000))).autoCompleted).toBeGreaterThanOrEqual(1);
    expect((await order(shipped)).status).toBe('completed');
  });
});
