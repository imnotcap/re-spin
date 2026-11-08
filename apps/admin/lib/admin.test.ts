import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { computeOrderAmounts, ore } from '@respin/core';
import { schema, type Db } from '@respin/db';
import { createTestDb } from '@respin/db/testing';
import { decideApproval, getOrder, listApprovals, listOrders, requestMoneyAction } from './orders';
import { dailySeries, dashboardStats, getUser, moderateListing, pendingListings, searchUsers, setUserStatus } from './people';

const s = schema;
let db: Db, close: () => Promise<void>;
beforeAll(async () => { ({ db, close } = await createTestDb()); });
afterAll(async () => { await close(); });

let k = 0;
async function user(name = 'Bruger') {
  const i = ++k;
  const [u] = await db.insert(s.users).values({ email: `a${i}@x.dk`, emailNormalized: `a${i}@x.dk`, displayName: `${name} ${i}` }).returning();
  return u!.id;
}
async function staff(role: 'support' | 'finance' | 'admin' = 'finance') {
  const [x] = await db.insert(s.staffUsers).values({ email: `staff${++k}@videro.dk`, role }).returning();
  return x!.id;
}
/** En betalt ordre til `kr` kroner */
async function paidOrder(kr: number) {
  const sellerId = await user('Sælger'), buyerId = await user('Køber');
  const [l] = await db.insert(s.listings).values({ sellerId, title: 'Uldfrakke', category: 'kvinder', condition: 'very_good', priceOre: kr * 100, shippingSize: 'small', status: 'sold', moderationStatus: 'approved' }).returning();
  const a = computeOrderAmounts({ price: ore(kr * 100), shipping: ore(3_900), sellerCertified: false });
  const [o] = await db.insert(s.orders).values({
    listingId: l!.id, buyerId, sellerId, status: 'paid', priceOre: a.price, buyerFeeOre: a.buyerFee, sellerFeeOre: a.sellerFee,
    shippingOre: a.shipping, buyerTotalOre: a.buyerTotal, sellerPayoutOre: a.sellerPayout, stripePaymentIntentId: `pi_${k}`
  }).returning();
  return o!.id;
}

describe('refundering', () => {
  it('under 1.000 kr.: udføres med det samme, bogføres og lægger Stripe-refundering i outbox', async () => {
    const me = await staff(), id = await paidOrder(300);
    expect(await requestMoneyAction(db, me, id, 'admin_refund', 'Varen kom aldrig frem')).toEqual({ ok: true, outcome: 'executed' });
    const o = await getOrder(db, id);
    expect(o!.order.status).toBe('refunded');
    expect(o!.events.at(-1)).toMatchObject({ event: 'admin_refund', actorType: 'admin', actorId: me });
    expect((await db.select().from(s.outbox).where(eq(s.outbox.dedupeKey, `refund:${id}`))).length).toBe(1);
    // Kan ikke refunderes to gange
    expect(await requestMoneyAction(db, me, id, 'admin_refund', 'Igen igen')).toMatchObject({ ok: false, error: 'not_allowed' });
  });

  it('fra 1.000 kr.: kræver en ANDEN medarbejders godkendelse; ens egen kan ikke godkendes', async () => {
    const a = await staff(), b = await staff(), id = await paidOrder(1_500);
    const r = await requestMoneyAction(db, a, id, 'admin_refund', 'Forkert vare sendt');
    expect(r).toMatchObject({ ok: true, outcome: 'requested' });
    if (!r.ok || !r.approvalId) throw new Error();
    expect((await getOrder(db, id))!.order.status).toBe('paid');
    expect(await requestMoneyAction(db, a, id, 'admin_refund', 'Forkert vare sendt')).toMatchObject({ ok: false, error: 'already_requested' });
    expect(await decideApproval(db, a, r.approvalId, true, '')).toEqual({ ok: false, error: 'own_request' });
    expect((await listApprovals(db)).map((x) => x.id)).toContain(r.approvalId);
    expect(await decideApproval(db, b, r.approvalId, true, 'Tjekket billederne')).toEqual({ ok: true });
    expect((await getOrder(db, id))!.order.status).toBe('refunded');
    expect(await decideApproval(db, b, r.approvalId, true, '')).toEqual({ ok: false, error: 'not_found' }); // allerede afgjort
  });

  it('databasen afviser selv at samme person godkender sin egen anmodning', async () => {
    const a = await staff(), id = await paidOrder(2_000);
    const r = await requestMoneyAction(db, a, id, 'admin_refund', 'Stor refundering');
    if (!r.ok || !r.approvalId) throw new Error();
    await expect(db.update(s.adminApprovals).set({ status: 'approved', decidedBy: a, decidedAt: new Date() }).where(eq(s.adminApprovals.id, r.approvalId))).rejects.toThrow();
  });

  it('afvist anmodning ændrer intet; tvist kan kun afgøres i status "tvist"; kort begrundelse afvises', async () => {
    const a = await staff(), b = await staff(), id = await paidOrder(1_200);
    expect(await requestMoneyAction(db, a, id, 'admin_refund', 'kort')).toEqual({ ok: false, error: 'invalid_reason' });
    const r = await requestMoneyAction(db, a, id, 'admin_refund', 'Køber fortrød');
    if (!r.ok || !r.approvalId) throw new Error();
    expect(await decideApproval(db, b, r.approvalId, false, 'Ikke dækket af køberbeskyttelsen')).toEqual({ ok: true });
    expect((await getOrder(db, id))!.order.status).toBe('paid');
    expect(await requestMoneyAction(db, a, id, 'admin_resolve_buyer', 'Køber har ret')).toMatchObject({ ok: false, error: 'not_allowed' });
    expect(await requestMoneyAction(db, a, crypto.randomUUID(), 'admin_refund', 'Findes ikke')).toEqual({ ok: false, error: 'not_found' });
  });

  it('ordresøgning på status og e-mail', async () => {
    const id = await paidOrder(150);
    expect((await listOrders(db, { status: 'paid' })).map((o) => o.id)).toContain(id);
    expect((await listOrders(db, { q: id })).map((o) => o.id)).toEqual([id]);
    expect((await listOrders(db, { status: 'hacker' })).length).toBeGreaterThan(0); // ukendt status ignoreres
  });
});

describe('brugere og moderation', () => {
  it('spærring logger brugeren ud overalt; genåbning virker; søgning escaper LIKE', async () => {
    const id = await user('Spærret');
    await db.insert(s.sessions).values({ tokenHash: String(k).padStart(64, "a"), userId: id, expiresAt: new Date(Date.now() + 86_400_000) });
    expect((await getUser(db, id))!.activeSessions).toBe(1);
    expect(await setUserStatus(db, id, 'suspended')).toBe(true);
    const u = await getUser(db, id);
    expect(u).toMatchObject({ status: 'suspended', activeSessions: 0 });
    expect(await setUserStatus(db, id, 'active')).toBe(true);
    expect((await searchUsers(db, 'Spærret')).map((x) => x.id)).toContain(id);
    expect((await searchUsers(db, '%')).length).toBe(0);
  });

  it('annoncer til gennemgang kan godkendes eller afvises (én gang)', async () => {
    const seller = await user();
    const [l] = await db.insert(s.listings).values({ sellerId: seller, title: 'Ring til mig', category: 'sko', condition: 'good', priceOre: 10_000, shippingSize: 'small', status: 'active', moderationStatus: 'pending' }).returning();
    expect((await pendingListings(db)).map((x) => x.id)).toContain(l!.id);
    expect(await moderateListing(db, l!.id, 'rejected')).toBe(true);
    expect(await moderateListing(db, l!.id, 'approved')).toBe(false);
  });

  it('nøgletal og dagsserie (14 dage, også dage uden aktivitet)', async () => {
    const st = await dashboardStats(db);
    expect(st.users.total).toBeGreaterThan(0);
    expect(st.orders.count30).toBeGreaterThan(0);
    const series = await dailySeries(db, 14);
    expect(series).toHaveLength(14);
    expect(series.at(-1)!.users).toBeGreaterThan(0);
  });
});
