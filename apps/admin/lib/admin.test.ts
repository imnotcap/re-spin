import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { computeOrderAmounts, ore } from '@respin/core';
import { schema, type Db } from '@respin/db';
import { createTestDb } from '@respin/db/testing';
import { decideApproval, getOrder, listApprovals, listOrders, requestMoneyAction } from './orders';
import { dailySeries, dashboardStats, deleteUser, getUser, moderateListing, pendingListings, searchUsers, setUserStatus } from './people';

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
    const [l] = await db.insert(s.listings).values({ sellerId: seller, title: 'Ring til mig', category: 'kvinder', condition: 'good', priceOre: 10_000, shippingSize: 'small', status: 'active', moderationStatus: 'pending' }).returning();
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

describe('slet bruger', () => {
  const listing = async (sellerId: string) => (await db.insert(s.listings).values({ sellerId, title: 'Testjakke', category: 'kvinder', condition: 'very_good', priceOre: 10_000, shippingSize: 'small', status: 'active', moderationStatus: 'approved' }).returning())[0]!.id;
  const rows = async <T>(q: Promise<T[]>) => (await q).length;

  it('uden penge-historik: alt om brugeren slettes, og andres data består', async () => {
    const bot = await user('Bot'), other = await user('Anden');
    const own = await listing(bot), theirs = await listing(other);
    await db.insert(s.listingImages).values([
      { ownerId: bot, listingId: own, storageKey: `listings/2026/11/${crypto.randomUUID()}.webp`, contentType: 'image/webp', bytes: 10, scanStatus: 'clean' },
      { ownerId: bot, storageKey: `listings/2026/11/${crypto.randomUUID()}.webp`, contentType: 'image/webp', bytes: 10, scanStatus: 'clean' }
    ]);
    // Botten skriver til en anden sælger og byder; en anden bruger skriver til botten
    const [c1] = await db.insert(s.conversations).values({ listingId: theirs, buyerId: bot, sellerId: other }).returning();
    await db.insert(s.messages).values({ conversationId: c1!.id, senderId: bot, body: 'Køb billigt her: spam.example' });
    const [c2] = await db.insert(s.conversations).values({ listingId: own, buyerId: other, sellerId: bot }).returning();
    await db.insert(s.messages).values({ conversationId: c2!.id, senderId: other, body: 'Er den stadig til salg?' });
    await db.insert(s.offers).values({ listingId: theirs, buyerId: bot, amountOre: 5_000, expiresAt: new Date(Date.now() + 86_400_000) });
    await db.insert(s.favorites).values({ userId: other, listingId: own });
    await db.insert(s.sessions).values({ tokenHash: 'b'.repeat(64), userId: bot, expiresAt: new Date(Date.now() + 86_400_000) });
    await db.insert(s.sellerProfiles).values({ userId: bot });
    await db.insert(s.supportCases).values({ userId: bot, subject: 'Hjælp mig', category: 'account' });
    await db.insert(s.listingPromotions).values({ kind: 'profile', sellerId: bot, package: '1d', priceOre: 1_000, status: 'paid', startsAt: new Date(), endsAt: new Date(Date.now() + 86_400_000) }); // testfremhævning uden Stripe

    expect((await getUser(db, bot))?.moneyHistory).toBe(false);
    expect(await deleteUser(db, bot)).toEqual({ ok: true, mode: 'deleted' });
    expect(await getUser(db, bot)).toBeNull();
    expect(await rows(db.select().from(s.listings).where(eq(s.listings.sellerId, bot)))).toBe(0);
    expect(await rows(db.select().from(s.listingImages).where(eq(s.listingImages.ownerId, bot)))).toBe(0);
    expect(await rows(db.select().from(s.conversations).where(eq(s.conversations.id, c1!.id)))).toBe(0);
    expect(await rows(db.select().from(s.conversations).where(eq(s.conversations.id, c2!.id)))).toBe(0);
    expect(await rows(db.select().from(s.sessions).where(eq(s.sessions.userId, bot)))).toBe(0);
    expect(await rows(db.select().from(s.supportCases).where(eq(s.supportCases.userId, bot)))).toBe(0);
    expect(await rows(db.select().from(s.listings).where(eq(s.listings.id, theirs)))).toBe(1); // den anden sælgers annonce består
    expect(await deleteUser(db, bot)).toEqual({ ok: false, error: 'not_found' });
  });

  it('med ordrer: anonymiseres, logges ud og annoncer fjernes – ordren består', async () => {
    const orderId = await paidOrder(200);
    const [o] = await db.select({ sellerId: s.orders.sellerId }).from(s.orders).where(eq(s.orders.id, orderId));
    const seller = o!.sellerId;
    const other = await listing(seller);
    await db.insert(s.sessions).values({ tokenHash: 'c'.repeat(64), userId: seller, expiresAt: new Date(Date.now() + 86_400_000) });

    expect((await getUser(db, seller))?.moneyHistory).toBe(true);
    expect(await deleteUser(db, seller)).toEqual({ ok: true, mode: 'anonymized' });
    const [u] = await db.select().from(s.users).where(eq(s.users.id, seller));
    expect(u).toMatchObject({ status: 'deleted', displayName: 'Slettet bruger', username: null, bio: null, avatarKey: null, email: `slettet-${seller}@slettet.invalid` });
    expect(u?.deletedAt).toBeInstanceOf(Date);
    const [sess] = await db.select().from(s.sessions).where(eq(s.sessions.userId, seller));
    expect(sess?.revokedAt).toBeInstanceOf(Date);
    const [l] = await db.select({ status: s.listings.status }).from(s.listings).where(eq(s.listings.id, other));
    expect(l?.status).toBe('removed');
    expect(await rows(db.select().from(s.orders).where(eq(s.orders.id, orderId)))).toBe(1);
    expect(await deleteUser(db, seller)).toEqual({ ok: false, error: 'already_deleted' });
  });

  it('afviser ugyldige id’er', async () => {
    expect(await deleteUser(db, "x' or '1'='1")).toEqual({ ok: false, error: 'not_found' });
  });
});
