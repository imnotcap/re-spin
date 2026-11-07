import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import Stripe from 'stripe';
import { schema, type Db } from '@respin/db';
import { createTestDb } from '@respin/db/testing';
import { fromKr, ledger, ore } from '@respin/core';
import { applyOrderEvent, createCheckout, httpStatusFor, ingestStripeWebhook, runOutbox, stripeGateway, type StripeGateway } from './index';

const s = schema;
const WH_SECRET = 'whsec_test_secret_value_1234567890';
const realStripe = new Stripe('sk_test_offline');
const verifier = stripeGateway(realStripe, WH_SECRET);

let db: Db, close: () => Promise<void>;
beforeAll(async () => { ({ db, close } = await createTestDb()); });
afterAll(async () => { await close(); });

let n = 0; // globalt: PaymentIntent-id'er skal være unikke på tværs af tests (som hos Stripe)
/** Falsk gateway: optager kald; webhook-verificering bruger den ÆGTE Stripe-SDK-kode */
function fakeGateway() {
  const calls = { pi: [] as any[], transfer: [] as any[], refund: [] as any[] };
  const gw: StripeGateway = {
    createPaymentIntent: async (p) => { calls.pi.push(p); return { id: `pi_${++n}`, clientSecret: `pi_${n}_secret` }; },
    createTransfer: async (p) => { calls.transfer.push(p); return { id: `tr_${p.orderId}` }; },
    createRefund: async (p) => { calls.refund.push(p); return { id: `re_${calls.refund.length}` }; },
    verifyWebhook: (raw, sig) => verifier.verifyWebhook(raw, sig)
  };
  return { gw, calls };
}

let counter = 0;
async function setupMarket(opts: { certified?: boolean; payoutsReady?: boolean } = {}) {
  const k = ++counter;
  const mk = async (name: string) => (await db.insert(s.users).values({ email: `${name}${k}@x.dk`, emailNormalized: `${name}${k}@x.dk`, displayName: name }).returning())[0]!;
  const seller = await mk('seller'); const buyer = await mk('buyer'); const stranger = await mk('stranger');
  await db.insert(s.sellerProfiles).values({ userId: seller.id, certified: !!opts.certified, certifiedAt: opts.certified ? new Date() : null, stripeAccountId: opts.payoutsReady === false ? null : `acct_${k}`, payoutsEnabled: opts.payoutsReady !== false });
  const [listing] = await db.insert(s.listings).values({ sellerId: seller.id, title: 'Ganni uldjakke', category: 'kvinder', condition: 'very_good', priceOre: 45_000, shippingSize: 'small', status: 'active', moderationStatus: 'approved' }).returning();
  return { seller, buyer, stranger, listing: listing! };
}

function signedWebhook(pi: Partial<Stripe.PaymentIntent> & { id: string }, type = 'payment_intent.succeeded', id = `evt_${Math.random().toString(36).slice(2)}`) {
  const payload = JSON.stringify({ id, object: 'event', type, livemode: false, data: { object: { object: 'payment_intent', currency: 'dkk', latest_charge: 'ch_1', ...pi } } });
  return { payload, id, signature: realStripe.webhooks.generateTestHeaderString({ payload, secret: WH_SECRET }) };
}

const ledgerBalances = async (orderId: string) => {
  const rows = await db.select({ account: s.ledgerEntries.account, direction: s.ledgerEntries.direction, amount: s.ledgerEntries.amountOre }).from(s.ledgerEntries).innerJoin(s.ledgerTransactions, eq(s.ledgerEntries.transactionId, s.ledgerTransactions.id)).where(eq(s.ledgerTransactions.orderId, orderId));
  return ledger && new Map([...rows.reduce((m, r) => m.set(r.account, (m.get(r.account) ?? 0) + (r.direction === 'debit' ? r.amount : -r.amount)), new Map<string, number>())]);
};
const order = async (id: string) => (await db.select().from(s.orders).where(eq(s.orders.id, id)))[0]!;
const pay = async (gw: StripeGateway, orderId: string, piId: string, amount?: number) => {
  const o = await order(orderId);
  const w = signedWebhook({ id: piId, amount_received: amount ?? o.buyerTotalOre, metadata: { orderId } });
  return ingestStripeWebhook(db, gw, { rawBody: w.payload, signature: w.signature });
};

describe('checkout', () => {
  it('serveren fastsætter alle beløb, og varen reserveres', async () => {
    const { gw, calls } = fakeGateway(); const m = await setupMarket();
    const r = await createCheckout(db, gw, { buyerId: m.buyer.id, listingId: m.listing.id });
    expect(r.ok).toBe(true); if (!r.ok) return;
    // 450 kr + køberbeskyttelse (5 % + 3 kr = 25,50) + fragt (39 kr)
    expect(r.amounts.buyerTotal).toBe(fromKr(514.5));
    expect(calls.pi[0]).toMatchObject({ amount: 51_450, orderId: r.orderId, idempotencyKey: `pi:${r.orderId}` });
    expect((await order(r.orderId)).status).toBe('pending_payment');
    expect((await db.select().from(s.listings).where(eq(s.listings.id, m.listing.id)))[0]!.status).toBe('reserved');
  });
  it('certificeret sælger giver 0,5 % gebyr, fastfrosset på ordren', async () => {
    const { gw } = fakeGateway(); const m = await setupMarket({ certified: true });
    const r = await createCheckout(db, gw, { buyerId: m.buyer.id, listingId: m.listing.id });
    if (!r.ok) throw new Error('forventede ok');
    expect(r.amounts.sellerFee).toBe(225);
    expect((await order(r.orderId)).sellerCertifiedAtOrder).toBe(true);
  });
  it('kan ikke købe sin egen vare, en reserveret vare eller en ugodkendt-mangler vare', async () => {
    const { gw } = fakeGateway(); const m = await setupMarket();
    expect(await createCheckout(db, gw, { buyerId: m.seller.id, listingId: m.listing.id })).toEqual({ ok: false, reason: 'own_listing' });
    expect((await createCheckout(db, gw, { buyerId: m.buyer.id, listingId: m.listing.id })).ok).toBe(true);
    expect(await createCheckout(db, gw, { buyerId: m.stranger.id, listingId: m.listing.id })).toEqual({ ok: false, reason: 'listing_unavailable' });
    const unapproved = (await db.insert(s.listings).values({ sellerId: m.seller.id, title: 'Ikke godkendt', category: 'kvinder', condition: 'good', priceOre: 10_000, shippingSize: 'small', status: 'active' }).returning())[0]!;
    expect(await createCheckout(db, gw, { buyerId: m.buyer.id, listingId: unapproved.id })).toEqual({ ok: false, reason: 'listing_unavailable' });
  });
  it('samtidige købere: kun én får varen', async () => {
    const { gw } = fakeGateway(); const m = await setupMarket();
    const results = await Promise.all([m.buyer.id, m.stranger.id].map((buyerId) => createCheckout(db, gw, { buyerId, listingId: m.listing.id })));
    expect(results.filter((r) => r.ok)).toHaveLength(1);
  });
  it('hvis Stripe fejler, frigives varen igen', async () => {
    const { gw } = fakeGateway(); const m = await setupMarket();
    const broken: StripeGateway = { ...gw, createPaymentIntent: async () => { throw new Error('stripe nede'); } };
    await expect(createCheckout(db, broken, { buyerId: m.buyer.id, listingId: m.listing.id })).rejects.toThrow('stripe nede');
    expect((await db.select().from(s.listings).where(eq(s.listings.id, m.listing.id)))[0]!.status).toBe('active');
  });
});

describe('webhooks', () => {
  it('betaling → ordre betalt, bogført, vare solgt; gentaget levering er en no-op', async () => {
    const { gw } = fakeGateway(); const m = await setupMarket();
    const co = await createCheckout(db, gw, { buyerId: m.buyer.id, listingId: m.listing.id }); if (!co.ok) throw new Error();
    const piId = (await order(co.orderId)).stripePaymentIntentId!; // tildelt af checkout
    const w = signedWebhook({ id: piId, amount_received: co.amounts.buyerTotal, metadata: { orderId: co.orderId } });

    const first = await ingestStripeWebhook(db, gw, { rawBody: w.payload, signature: w.signature });
    expect(first).toMatchObject({ status: 'processed' });
    const o = await order(co.orderId);
    expect(o.status).toBe('paid'); expect(o.stripeChargeId).toBe('ch_1'); expect(o.shipByAt).not.toBeNull();
    expect((await db.select().from(s.listings).where(eq(s.listings.id, m.listing.id)))[0]!.status).toBe('sold');
    const b = await ledgerBalances(co.orderId);
    expect(b.get(ledger.accounts.escrow(co.orderId))).toBe(-45_000);
    expect(b.get(ledger.accounts.stripeBalance)).toBe(co.amounts.buyerTotal);

    const again = await ingestStripeWebhook(db, gw, { rawBody: w.payload, signature: w.signature });
    expect(again).toMatchObject({ status: 'duplicate' });
    expect(httpStatusFor(again)).toBe(200);
    expect(await db.select().from(s.ledgerTransactions).where(eq(s.ledgerTransactions.orderId, co.orderId))).toHaveLength(1);
  });
  it('forfalsket eller manglende signatur afvises uden at gemme noget', async () => {
    const { gw } = fakeGateway();
    const w = signedWebhook({ id: 'pi_x', amount_received: 1 });
    expect(await ingestStripeWebhook(db, gw, { rawBody: w.payload, signature: null })).toEqual({ status: 'invalid_signature' });
    expect(await ingestStripeWebhook(db, gw, { rawBody: w.payload, signature: 't=1,v1=deadbeef' })).toEqual({ status: 'invalid_signature' });
    const tampered = w.payload.replace('"amount_received":1', '"amount_received":99999');
    expect(await ingestStripeWebhook(db, gw, { rawBody: tampered, signature: w.signature })).toEqual({ status: 'invalid_signature' });
    expect(httpStatusFor({ status: 'invalid_signature' })).toBe(400);
    expect(await db.select().from(s.stripeEvents).where(eq(s.stripeEvents.id, w.id))).toHaveLength(0);
  });
  it('gammel (replayet) signatur afvises', async () => {
    const { gw } = fakeGateway();
    const payload = JSON.stringify({ id: 'evt_old', object: 'event', type: 'payment_intent.succeeded', livemode: false, data: { object: {} } });
    const old = realStripe.webhooks.generateTestHeaderString({ payload, secret: WH_SECRET, timestamp: Math.floor(Date.now() / 1000) - 3600 });
    expect(await ingestStripeWebhook(db, gw, { rawBody: payload, signature: old })).toEqual({ status: 'invalid_signature' });
  });
  it('forkert beløb markerer IKKE ordren som betalt, logges og giver 500 (Stripe prøver igen)', async () => {
    const { gw } = fakeGateway(); const m = await setupMarket();
    const co = await createCheckout(db, gw, { buyerId: m.buyer.id, listingId: m.listing.id }); if (!co.ok) throw new Error();
    await db.update(s.orders).set({ stripePaymentIntentId: 'pi_cheat' }).where(eq(s.orders.id, co.orderId));
    const out = await pay(gw, co.orderId, 'pi_cheat', 100); // betaler 1 kr. i stedet for 514,50
    expect(out).toMatchObject({ status: 'failed' }); expect(httpStatusFor(out)).toBe(500);
    expect((await order(co.orderId)).status).toBe('pending_payment');
    expect((await db.select().from(s.auditLog).where(eq(s.auditLog.targetId, co.orderId)))[0]).toMatchObject({ action: 'payment.mismatch' });
  });
  it('betaling med en andens PaymentIntent på ordren afvises', async () => {
    const { gw } = fakeGateway(); const m = await setupMarket();
    const co = await createCheckout(db, gw, { buyerId: m.buyer.id, listingId: m.listing.id }); if (!co.ok) throw new Error();
    expect(await pay(gw, co.orderId, 'pi_someone_elses')).toMatchObject({ status: 'failed' });
    expect((await order(co.orderId)).status).toBe('pending_payment');
  });
  it('sen betaling (ordren er udløbet) giver refundering, ikke en betalt ordre', async () => {
    const { gw, calls } = fakeGateway(); const m = await setupMarket();
    const co = await createCheckout(db, gw, { buyerId: m.buyer.id, listingId: m.listing.id }); if (!co.ok) throw new Error();
    await applyOrderEvent(db, { orderId: co.orderId, event: 'payment_expired', actor: 'system' });
    await db.update(s.orders).set({ stripePaymentIntentId: 'pi_late' }).where(eq(s.orders.id, co.orderId));
    expect(await pay(gw, co.orderId, 'pi_late')).toMatchObject({ status: 'processed' });
    expect((await order(co.orderId)).status).toBe('expired');
    expect(await runOutbox(db, gw)).toMatchObject({ done: 1 });
    expect(calls.refund.at(-1)).toMatchObject({ paymentIntentId: 'pi_late' });
  });
});

describe('ordre-overgange og ejerskab', () => {
  async function paidOrder(opts?: Parameters<typeof setupMarket>[0]) {
    const f = fakeGateway(); const m = await setupMarket(opts);
    const co = await createCheckout(db, f.gw, { buyerId: m.buyer.id, listingId: m.listing.id }); if (!co.ok) throw new Error();
    await db.update(s.orders).set({ stripePaymentIntentId: `pi_${co.orderId}` }).where(eq(s.orders.id, co.orderId));
    await pay(f.gw, co.orderId, `pi_${co.orderId}`);
    return { ...f, m, co };
  }
  it('fremmede og forkerte roller får samme svar som "findes ikke" (ingen IDOR/enumerering)', async () => {
    const { m, co } = await paidOrder();
    expect(await applyOrderEvent(db, { orderId: co.orderId, event: 'seller_ship', actor: 'seller', actorId: m.stranger.id })).toMatchObject({ ok: false, reason: 'not_found' });
    expect(await applyOrderEvent(db, { orderId: co.orderId, event: 'seller_ship', actor: 'seller', actorId: m.buyer.id })).toMatchObject({ ok: false, reason: 'not_found' });
    expect(await applyOrderEvent(db, { orderId: co.orderId, event: 'seller_ship', actor: 'seller', actorId: null })).toMatchObject({ ok: false, reason: 'not_found' });
    expect(await applyOrderEvent(db, { orderId: '00000000-0000-4000-8000-000000000000', event: 'seller_ship', actor: 'system' })).toMatchObject({ ok: false, reason: 'not_found' });
    expect((await order(co.orderId)).status).toBe('paid');
  });
  it('kun den rette part kan udløse overgange, og trin kan ikke springes over', async () => {
    const { m, co } = await paidOrder();
    expect(await applyOrderEvent(db, { orderId: co.orderId, event: 'buyer_approve', actor: 'buyer', actorId: m.buyer.id })).toMatchObject({ ok: false, reason: 'invalid_state' });
    expect(await applyOrderEvent(db, { orderId: co.orderId, event: 'payment_succeeded', actor: 'seller', actorId: m.seller.id })).toMatchObject({ ok: false });
    expect(await applyOrderEvent(db, { orderId: co.orderId, event: 'seller_ship', actor: 'seller', actorId: m.seller.id })).toMatchObject({ ok: true, to: 'shipped' });
  });
  it('hele forløbet: levering → godkendelse → frigivelse → udbetaling (præcis én overførsel, regnskabet går i nul)', async () => {
    const { gw, calls, m, co } = await paidOrder({ certified: true });
    await applyOrderEvent(db, { orderId: co.orderId, event: 'seller_ship', actor: 'seller', actorId: m.seller.id });
    await applyOrderEvent(db, { orderId: co.orderId, event: 'carrier_delivered', actor: 'system' });
    expect((await order(co.orderId)).autoCompleteAt).not.toBeNull();
    expect(await applyOrderEvent(db, { orderId: co.orderId, event: 'buyer_approve', actor: 'buyer', actorId: m.buyer.id })).toMatchObject({ ok: true, to: 'completed' });

    expect(await runOutbox(db, gw)).toEqual({ done: 1, retried: 0, failed: 0 });
    expect(calls.transfer).toHaveLength(1);
    expect(calls.transfer[0]).toMatchObject({ amount: 44_775, destination: expect.stringMatching(/^acct_/), sourceTransaction: 'ch_1', idempotencyKey: `transfer:${co.orderId}` });
    expect(await runOutbox(db, gw)).toEqual({ done: 0, retried: 0, failed: 0 }); // intet at gøre – ingen dobbeltudbetaling
    expect(calls.transfer).toHaveLength(1);

    const b = await ledgerBalances(co.orderId);
    expect(b.get(ledger.accounts.escrow(co.orderId)) ?? 0).toBe(0);
    expect(b.get(ledger.accounts.sellerPayable(m.seller.id)) ?? 0).toBe(0);
    expect([...b.values()].reduce((x, y) => x + y, 0)).toBe(0);
    expect((await order(co.orderId)).stripeTransferId).toBe(`tr_${co.orderId}`);
  });
  it('sælger uden færdig Stripe-onboarding: pengene venter, prøves igen med backoff og udbetales når klar', async () => {
    const { gw, calls, m, co } = await paidOrder({ payoutsReady: false });
    for (const [event, actor, actorId] of [['seller_ship', 'seller', m.seller.id], ['carrier_delivered', 'system', null], ['buyer_approve', 'buyer', m.buyer.id]] as const) await applyOrderEvent(db, { orderId: co.orderId, event, actor, actorId });
    const t0 = new Date();
    expect(await runOutbox(db, gw, { now: t0 })).toEqual({ done: 0, retried: 1, failed: 0 });
    expect(await runOutbox(db, gw, { now: t0 })).toEqual({ done: 0, retried: 0, failed: 0 }); // backoff: ikke due endnu
    await db.update(s.sellerProfiles).set({ stripeAccountId: 'acct_ready', payoutsEnabled: true }).where(eq(s.sellerProfiles.userId, m.seller.id));
    expect(await runOutbox(db, gw, { now: new Date(t0.getTime() + 3 * 60_000) })).toEqual({ done: 1, retried: 0, failed: 0 });
    expect(calls.transfer).toHaveLength(1);
  });
  it('en transfer der fejler efter Stripe-kaldet kan genkøres uden dobbeltudbetaling (samme idempotensnøgle)', async () => {
    const { gw, calls, m, co } = await paidOrder();
    for (const [event, actor, actorId] of [['seller_ship', 'seller', m.seller.id], ['carrier_delivered', 'system', null], ['buyer_approve', 'buyer', m.buyer.id]] as const) await applyOrderEvent(db, { orderId: co.orderId, event, actor, actorId });
    let first = true;
    const flaky: StripeGateway = { ...gw, createTransfer: async (p) => { const r = await gw.createTransfer(p); if (first) { first = false; throw new Error('netværk døde efter succes'); } return r; } };
    expect(await runOutbox(db, flaky)).toMatchObject({ retried: 1 });
    expect(await runOutbox(db, flaky, { now: new Date(Date.now() + 5 * 60_000) })).toMatchObject({ done: 1 });
    expect(new Set(calls.transfer.map((t) => t.idempotencyKey)).size).toBe(1); // Stripe ville returnere samme transfer
    expect((await ledgerBalances(co.orderId)).get(ledger.accounts.sellerPayable(m.seller.id)) ?? 0).toBe(0);
  });
  it('sælger annullerer: køber får alt tilbage, varen kan sælges igen', async () => {
    const { gw, calls, m, co } = await paidOrder();
    expect(await applyOrderEvent(db, { orderId: co.orderId, event: 'seller_cancel', actor: 'seller', actorId: m.seller.id })).toMatchObject({ ok: true, to: 'refunded' });
    expect((await db.select().from(s.listings).where(eq(s.listings.id, m.listing.id)))[0]!.status).toBe('active');
    for (const v of (await ledgerBalances(co.orderId)).values()) expect(v).toBe(0);
    expect(await runOutbox(db, gw)).toMatchObject({ done: 1 });
    expect(calls.refund[0]).toMatchObject({ idempotencyKey: `refund:pi_${co.orderId}` });
  });
  it('tvist: kun admin kan afgøre den, og først da frigives pengene', async () => {
    const { m, co } = await paidOrder();
    for (const [event, actor, actorId] of [['seller_ship', 'seller', m.seller.id], ['carrier_delivered', 'system', null], ['buyer_dispute', 'buyer', m.buyer.id]] as const) await applyOrderEvent(db, { orderId: co.orderId, event, actor, actorId });
    expect((await order(co.orderId)).status).toBe('disputed');
    expect(await applyOrderEvent(db, { orderId: co.orderId, event: 'admin_resolve_seller', actor: 'seller', actorId: m.seller.id })).toMatchObject({ ok: false });
    expect(await applyOrderEvent(db, { orderId: co.orderId, event: 'admin_resolve_seller', actor: 'admin', actorId: 'staff-1' })).toMatchObject({ ok: true, to: 'completed' });
    expect(await db.select().from(s.orderEvents).where(eq(s.orderEvents.orderId, co.orderId))).toHaveLength(5);
  });
  it('samtidige overgange: kun én vinder (optimistisk lås + række-lås)', async () => {
    const { m, co } = await paidOrder();
    const attempts = await Promise.all([1, 2, 3].map(() => applyOrderEvent(db, { orderId: co.orderId, event: 'seller_ship', actor: 'seller', actorId: m.seller.id })));
    expect(attempts.filter((a) => a.ok)).toHaveLength(1);
    expect(await db.select().from(s.orderEvents).where(eq(s.orderEvents.orderId, co.orderId))).toHaveLength(2); // payment_succeeded + ét seller_ship
  });
});
