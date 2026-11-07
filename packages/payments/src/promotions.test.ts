import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import Stripe from 'stripe';
import { schema, type Db } from '@respin/db';
import { createTestDb } from '@respin/db/testing';
import { promotionPeriod } from '@respin/core';
import { activatePromotion, ingestStripeWebhook, stripeGateway, type StripeGateway } from './index';

const s = schema;
const WH_SECRET = 'whsec_test_secret_value_1234567890';
const realStripe = new Stripe('sk_test_offline');
const verifier = stripeGateway(realStripe, WH_SECRET);
const gw = { verifyWebhook: (raw: string, sig: string) => verifier.verifyWebhook(raw, sig) } as unknown as StripeGateway;

let db: Db, close: () => Promise<void>;
beforeAll(async () => { ({ db, close } = await createTestDb()); });
afterAll(async () => { await close(); });

let k = 0;
async function setup(pkg: '1d' | '3d' | '7d' = '3d', priceOre = 3_900) {
  const i = ++k;
  const [u] = await db.insert(s.users).values({ email: `p${i}@x.dk`, emailNormalized: `p${i}@x.dk`, displayName: 'Sælger' }).returning();
  const [l] = await db.insert(s.listings).values({ sellerId: u!.id, title: 'Ganni uldjakke', category: 'kvinder', condition: 'very_good', priceOre: 45_000, shippingSize: 'small', status: 'active', moderationStatus: 'approved' }).returning();
  const [p] = await db.insert(s.listingPromotions).values({ listingId: l!.id, sellerId: u!.id, package: pkg, priceOre, stripeSessionId: `cs_test_${i}` }).returning();
  return { promo: p!, listing: l! };
}

function signed(session: Record<string, unknown>, type = 'checkout.session.completed') {
  const id = `evt_${Math.random().toString(36).slice(2)}`;
  const payload = JSON.stringify({ id, object: 'event', type, livemode: false, data: { object: { object: 'checkout.session', currency: 'dkk', payment_status: 'paid', ...session } } });
  return { rawBody: payload, signature: realStripe.webhooks.generateTestHeaderString({ payload, secret: WH_SECRET }) };
}
const promo = async (id: string) => (await db.select().from(s.listingPromotions).where(eq(s.listingPromotions.id, id)))[0]!;

describe('fremhævning: periode', () => {
  it('starter nu, eller i forlængelse af en fremhævning der stadig kører', () => {
    const now = new Date('2026-11-07T12:00:00Z');
    expect(promotionPeriod(3, now)).toEqual({ startsAt: now, endsAt: new Date('2026-11-10T12:00:00Z') });
    const running = new Date('2026-11-08T12:00:00Z');
    expect(promotionPeriod(1, now, running)).toEqual({ startsAt: running, endsAt: new Date('2026-11-09T12:00:00Z') });
    expect(promotionPeriod(1, now, new Date('2026-11-01T00:00:00Z')).startsAt).toEqual(now); // udløbet → starter nu
  });
});

describe('fremhævning: betaling via webhook', () => {
  it('gyldig betaling aktiverer; samme event igen ændrer intet', async () => {
    const { promo: p } = await setup();
    const ev = signed({ id: p.stripeSessionId, amount_total: 3_900, metadata: { kind: 'promotion', promotionId: p.id } });
    expect((await ingestStripeWebhook(db, gw, ev)).status).toBe('processed');
    const after = await promo(p.id);
    expect(after.status).toBe('paid');
    expect(after.endsAt!.getTime() - after.startsAt!.getTime()).toBe(3 * 86_400_000);
    expect((await ingestStripeWebhook(db, gw, ev)).status).toBe('duplicate');
    expect((await promo(p.id)).endsAt).toEqual(after.endsAt);
  });

  it('forkert beløb, valuta, session eller ubetalt → aktiveres IKKE (og logges)', async () => {
    for (const bad of [{ amount_total: 100 }, { currency: 'eur' }, { id: 'cs_fremmed' }, { payment_status: 'unpaid' }]) {
      const { promo: p } = await setup();
      const r = await ingestStripeWebhook(db, gw, signed({ id: p.stripeSessionId, amount_total: 3_900, metadata: { kind: 'promotion', promotionId: p.id }, ...bad }));
      expect(r.status, JSON.stringify(bad)).toBe('failed');
      expect((await promo(p.id)).status, JSON.stringify(bad)).toBe('pending');
    }
    const logged = await db.select().from(s.auditLog).where(eq(s.auditLog.action, 'promotion.payment_mismatch'));
    expect(logged.length).toBe(4);
  });

  it('falsk signatur afvises; ukendt id og andre checkout-sessioner ignoreres uden at fejle', async () => {
    const { promo: p } = await setup();
    const ev = signed({ id: p.stripeSessionId, amount_total: 3_900, metadata: { kind: 'promotion', promotionId: p.id } });
    expect((await ingestStripeWebhook(db, gw, { ...ev, signature: 't=1,v1=forfalsket' })).status).toBe('invalid_signature');
    expect((await promo(p.id)).status).toBe('pending');
    expect((await ingestStripeWebhook(db, gw, signed({ id: 'cs_x', amount_total: 100, metadata: {} }))).status).toBe('ignored');
    // PaymentIntent for en fremhævning må ikke blive behandlet som en ordre (ellers fejl og evige genforsøg)
    const pi = JSON.stringify({ id: 'evt_pi_promo', object: 'event', type: 'payment_intent.succeeded', livemode: false, data: { object: { object: 'payment_intent', id: 'pi_promo', amount_received: 3_900, currency: 'dkk', metadata: { kind: 'promotion', promotionId: p.id } } } });
    expect((await ingestStripeWebhook(db, gw, { rawBody: pi, signature: realStripe.webhooks.generateTestHeaderString({ payload: pi, secret: WH_SECRET }) })).status).toBe('ignored');
  });

  it('to køb på samme annonce lægges i forlængelse af hinanden', async () => {
    const { promo: a, listing } = await setup('1d', 1_900);
    const [b] = await db.insert(s.listingPromotions).values({ listingId: listing.id, sellerId: a.sellerId, package: '3d', priceOre: 3_900 }).returning();
    const now = new Date('2026-11-07T12:00:00Z');
    const pa = await activatePromotion(db, a.id, now);
    const pb = await activatePromotion(db, b!.id, now);
    expect(pb!.startsAt).toEqual(pa!.endsAt);
    expect(pb!.endsAt.getTime() - pa!.startsAt.getTime()).toBe(4 * 86_400_000);
  });
});
