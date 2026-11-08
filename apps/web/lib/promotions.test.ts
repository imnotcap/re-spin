import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { schema, type Db } from '@respin/db';
import { createTestDb } from '@respin/db/testing';
import type { StripeGateway } from '@respin/payments';
import { MemoryImageStore, newImageKey } from './image-store';
import { createListing, listFeed, saveProcessedImage } from './listings';
import { activePromotions, startPromotion } from './promotions';

let db: Db, close: () => Promise<void>;
const store = new MemoryImageStore();
beforeAll(async () => { ({ db, close } = await createTestDb()); });
afterAll(async () => { await close(); });

let n = 0;
async function seller() {
  const i = ++n;
  const [u] = await db.insert(schema.users).values({ email: `s${i}@x.dk`, emailNormalized: `s${i}@x.dk`, displayName: 'Sælger', emailVerifiedAt: new Date() }).returning();
  return u!.id;
}
async function listing(sellerId: string, title: string) {
  const id = crypto.randomUUID();
  await saveProcessedImage(db, store, sellerId, { id, key: newImageKey(id), main: Buffer.from('m'), thumb: Buffer.from('t'), width: 800, height: 1000 });
  const r = await createListing(db, sellerId, { title, description: '', category: 'kvinder', condition: 'good', priceOre: 20_000, shippingSize: 'small', imageKeys: [id] });
  if (!r.ok) throw new Error(r.error);
  return r.id;
}
const fakeStripe = () => {
  const calls: Parameters<StripeGateway['createCheckoutSession']>[0][] = [];
  const gateway = { createCheckoutSession: async (p: (typeof calls)[number]) => { calls.push(p); return { id: `cs_${calls.length}`, url: `https://checkout.stripe.test/${calls.length}` }; } } as unknown as StripeGateway;
  return { gateway, calls };
};

describe('køb af fremhævning', () => {
  it('ejeren får et Stripe-link; prisen kommer fra pakken; intet er aktivt før betaling', async () => {
    const me = await seller(); const id = await listing(me, 'Nike Air Max');
    const { gateway, calls } = fakeStripe();
    const r = await startPromotion(db, me, id, '7d', { gateway, appUrl: 'https://videro.dk/', allowTestActivation: false });
    expect(r).toEqual({ ok: true, checkoutUrl: 'https://checkout.stripe.test/1' });
    expect(calls[0]).toMatchObject({ amountOre: 6_900, successUrl: 'https://videro.dk/konto/annoncer/?fremhaevet=1', idempotencyKey: expect.stringMatching(/^promotion:/) });
    const [row] = await db.select().from(schema.listingPromotions).where(eq(schema.listingPromotions.listingId, id));
    expect(row).toMatchObject({ status: 'pending', priceOre: 6_900, stripeSessionId: 'cs_1', package: '7d' });
    expect((await activePromotions(db, [id])).size).toBe(0);
  });

  it('andres annoncer, ukendte pakker og ikke-aktive annoncer afvises (IDOR)', async () => {
    const me = await seller(), other = await seller(); const id = await listing(me, 'Taske');
    const deps = { gateway: fakeStripe().gateway, appUrl: 'https://videro.dk', allowTestActivation: false };
    expect(await startPromotion(db, other, id, '1d', deps)).toEqual({ ok: false, error: 'not_found' });
    expect(await startPromotion(db, me, id, '30d', deps)).toEqual({ ok: false, error: 'invalid_package' });
    expect(await startPromotion(db, me, "x' or 1=1", '1d', deps)).toEqual({ ok: false, error: 'not_found' });
    await db.update(schema.listings).set({ status: 'sold' }).where(eq(schema.listings.id, id));
    expect(await startPromotion(db, me, id, '1d', deps)).toEqual({ ok: false, error: 'not_active' });
    expect(await startPromotion(db, me, await listing(me, 'x y z'), '1d', { ...deps, gateway: null })).toEqual({ ok: false, error: 'payments_unavailable' });
    expect((await db.select().from(schema.listingPromotions).where(eq(schema.listingPromotions.sellerId, other))).length).toBe(0);
  });

  it('fremhævede annoncer kommer først i feedet og får mærket; udløbne gør ikke', async () => {
    const me = await seller();
    const old = await listing(me, 'Gammel annonce'); await listing(me, 'Ny annonce');
    expect((await listFeed(db, store, { sellerId: me }))[0]!.title).toBe('Ny annonce');
    expect(await startPromotion(db, me, old, '1d', { gateway: null, appUrl: 'https://videro.dk', allowTestActivation: true })).toEqual({ ok: true, activated: true });
    const feed = await listFeed(db, store, { sellerId: me });
    expect(feed.map((c) => [c.title, !!c.promoted])).toEqual([['Gammel annonce', true], ['Ny annonce', false]]);
    expect((await activePromotions(db, [old])).get(old)!.getTime()).toBeGreaterThan(Date.now());
    await db.update(schema.listingPromotions).set({ startsAt: new Date(Date.now() - 3 * 86_400_000), endsAt: new Date(Date.now() - 86_400_000) }).where(eq(schema.listingPromotions.listingId, old));
    expect((await listFeed(db, store, { sellerId: me }))[0]!.title).toBe('Ny annonce');
    expect((await activePromotions(db, [old])).size).toBe(0);
  });
});
