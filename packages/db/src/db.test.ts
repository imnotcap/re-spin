import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { eq, sql } from 'drizzle-orm';
import { computeOrderAmounts, fromKr, ledger } from '@respin/core';
import * as s from './schema';
import { createTestDb, errorMessageOf } from './testing';
import type { Db } from './client';

let db: Db, close: () => Promise<void>;
beforeAll(async () => { ({ db, close } = await createTestDb()); });
afterAll(async () => { await close(); });

let n = 0;
const user = async (name: string) => (await db.insert(s.users).values({ email: `${name}${++n}@x.dk`, emailNormalized: `${name}${n}@x.dk`, displayName: name }).returning())[0]!;
const listing = async (sellerId: string, priceOre = 45_000) => (await db.insert(s.listings).values({ sellerId, title: 'Ganni uldjakke', category: 'vintage', condition: 'almost_new', priceOre, shippingSize: 'small' }).returning())[0]!;
const orderValues = (listingId: string, buyerId: string, sellerId: string) => {
  const a = computeOrderAmounts({ price: fromKr(450), shipping: fromKr(39), sellerCertified: false });
  return { listingId, buyerId, sellerId, priceOre: a.price, buyerFeeOre: a.buyerFee, sellerFeeOre: a.sellerFee, shippingOre: a.shipping, buyerTotalOre: a.buyerTotal, sellerPayoutOre: a.sellerPayout };
};

describe('constraints', () => {
  it('afviser priser uden for 1–100.000 kr.', async () => {
    const seller = await user('s');
    expect(await errorMessageOf(listing(seller.id, 50))).toMatch(/listings_price_range/);
    expect(await errorMessageOf(listing(seller.id, 10_000_001))).toMatch(/listings_price_range/);
    expect(await errorMessageOf(listing(seller.id, 45_000))).toBeNull();
  });
  it('e-mail skal være normaliseret og unik', async () => {
    expect(await errorMessageOf(db.insert(s.users).values({ email: 'A@x.dk', emailNormalized: 'A@x.dk', displayName: 'a' }))).toMatch(/users_email_normalized_lower/);
  });
  it('køber og sælger kan ikke være den samme', async () => {
    const u = await user('self'); const l = await listing(u.id);
    expect(await errorMessageOf(db.insert(s.orders).values(orderValues(l.id, u.id, u.id)))).toMatch(/orders_distinct_parties/);
  });
  it('en ordres beløb skal hænge sammen (kan ikke gemme et forkert samlet beløb)', async () => {
    const seller = await user('s'); const buyer = await user('b'); const l = await listing(seller.id);
    const bad = { ...orderValues(l.id, buyer.id, seller.id), buyerTotalOre: 1 };
    expect(await errorMessageOf(db.insert(s.orders).values(bad))).toMatch(/orders_buyer_total/);
  });
  it('certificeret sælger kræver certificeringsdato', async () => {
    const u = await user('c');
    expect(await errorMessageOf(db.insert(s.sellerProfiles).values({ userId: u.id, certified: true }))).toMatch(/seller_certified_has_date/);
  });
});

describe('dobbeltsalg', () => {
  it('kun én aktiv ordre pr. annonce – også ved samtidige køb', async () => {
    const seller = await user('s'); const b1 = await user('b1'); const b2 = await user('b2'); const l = await listing(seller.id);
    const results = await Promise.all([
      errorMessageOf(db.insert(s.orders).values(orderValues(l.id, b1.id, seller.id))),
      errorMessageOf(db.insert(s.orders).values(orderValues(l.id, b2.id, seller.id)))
    ]);
    expect(results.filter((r) => r === null)).toHaveLength(1);
    expect(results.filter((r) => r !== null)[0]).toMatch(/orders_one_active_per_listing/);
  });
  it('når den første ordre er annulleret, kan varen købes igen', async () => {
    const seller = await user('s'); const b1 = await user('b1'); const b2 = await user('b2'); const l = await listing(seller.id);
    const [o1] = await db.insert(s.orders).values(orderValues(l.id, b1.id, seller.id)).returning();
    await db.update(s.orders).set({ status: 'cancelled' }).where(eq(s.orders.id, o1!.id));
    expect(await errorMessageOf(db.insert(s.orders).values(orderValues(l.id, b2.id, seller.id)))).toBeNull();
  });
});

describe('ordre-vagter', () => {
  it('beløb og parter kan ikke ændres efter oprettelse', async () => {
    const seller = await user('s'); const buyer = await user('b'); const l = await listing(seller.id);
    const [o] = await db.insert(s.orders).values(orderValues(l.id, buyer.id, seller.id)).returning();
    expect(await errorMessageOf(db.update(s.orders).set({ sellerPayoutOre: 999_999, priceOre: 1_000_000, buyerTotalOre: 1_000_000 + o!.buyerFeeOre + o!.shippingOre }).where(eq(s.orders.id, o!.id)))).toMatch(/immutable/);
  });
  it('afsluttede ordrer kan ikke genåbnes', async () => {
    const seller = await user('s'); const buyer = await user('b'); const l = await listing(seller.id);
    const [o] = await db.insert(s.orders).values(orderValues(l.id, buyer.id, seller.id)).returning();
    await db.update(s.orders).set({ status: 'completed' }).where(eq(s.orders.id, o!.id));
    expect(await errorMessageOf(db.update(s.orders).set({ status: 'paid' }).where(eq(s.orders.id, o!.id)))).toMatch(/final/);
  });
});

describe('bogholderi i databasen', () => {
  const post = (orderId: string | null, key: string, lines: ledger.LedgerLine[], skipLast = false) => db.transaction(async (tx) => {
    const [t] = await tx.insert(s.ledgerTransactions).values({ orderId, kind: 'test', idempotencyKey: key }).returning();
    const rows = (skipLast ? lines.slice(0, -1) : lines).map((l) => ({ transactionId: t!.id, account: l.account, direction: l.direction, amountOre: l.amount }));
    await tx.insert(s.ledgerEntries).values(rows);
  });
  const sample = () => ledger.paymentCaptured('o', computeOrderAmounts({ price: fromKr(450), shipping: fromKr(39), sellerCertified: false }));

  it('accepterer balancerede transaktioner fra core', async () => { expect(await errorMessageOf(post(null, 'ok-1', sample()))).toBeNull(); });
  it('afviser ubalancerede transaktioner ved commit', async () => { expect(await errorMessageOf(post(null, 'bad-1', sample(), true))).toMatch(/unbalanced/); });
  it('samme pengebevægelse kan ikke bogføres to gange (idempotens-nøgle)', async () => {
    expect(await errorMessageOf(post(null, 'dup-1', sample()))).toBeNull();
    expect(await errorMessageOf(post(null, 'dup-1', sample()))).toMatch(/idempotency_key|unique/i);
  });
  it('ledger-linjer kan ikke ændres, slettes eller tømmes', async () => {
    expect(await errorMessageOf(db.update(s.ledgerEntries).set({ amountOre: 1 }))).toMatch(/append-only/);
    expect(await errorMessageOf(db.delete(s.ledgerEntries))).toMatch(/append-only/);
    expect(await errorMessageOf(db.execute(sql.raw('TRUNCATE ledger_entries CASCADE')))).toMatch(/TRUNCATE on ledger_entries is not allowed/);
  });
});

describe('audit-log og Stripe-events', () => {
  it('audit-log er append-only', async () => {
    await db.insert(s.auditLog).values({ actorType: 'staff', actorId: 'x', action: 'refund.issue' });
    expect(await errorMessageOf(db.update(s.auditLog).set({ action: 'nothing' }))).toMatch(/append-only/);
    expect(await errorMessageOf(db.delete(s.auditLog))).toMatch(/append-only/);
  });
  it('samme Stripe-event kan kun modtages én gang', async () => {
    const ev = { id: 'evt_1', type: 'payment_intent.succeeded', livemode: false, payload: {} };
    expect(await db.insert(s.stripeEvents).values(ev).onConflictDoNothing().returning()).toHaveLength(1);
    expect(await db.insert(s.stripeEvents).values(ev).onConflictDoNothing().returning()).toHaveLength(0);
  });
});
