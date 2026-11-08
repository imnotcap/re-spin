import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { schema, type Db } from '@respin/db';
import { createTestDb } from '@respin/db/testing';
import { closeReportsFor, deleteListing, getListingAdmin, moderate, openReportsDetailed, recategorize, searchListings, warnUser, warningsForUser } from './listings';
import { analytics } from './analytics';

const s = schema;
let db: Db, close: () => Promise<void>;
beforeAll(async () => { ({ db, close } = await createTestDb()); });
afterAll(async () => { await close(); });

let k = 0;
async function user() {
  const i = ++k;
  const [u] = await db.insert(s.users).values({ email: `m${i}@x.dk`, emailNormalized: `m${i}@x.dk`, displayName: `Sælger ${i}` }).returning();
  return u!.id;
}
async function staff() {
  const [x] = await db.insert(s.staffUsers).values({ email: `mod${++k}@videro.dk`, role: 'moderator' }).returning();
  return x!.id;
}
async function listing(sellerId: string, extra: Partial<typeof s.listings.$inferInsert> = {}) {
  const [l] = await db.insert(s.listings).values({ sellerId, title: 'Uldfrakke fra Ganni', category: 'kvinder', subcategory: 'Frakker og jakker', condition: 'very_good', priceOre: 45_000, shippingSize: 'small', status: 'active', moderationStatus: 'approved', ...extra }).returning();
  return l!.id;
}
const row = async (id: string) => (await db.select().from(s.listings).where(eq(s.listings.id, id)))[0];

describe('moderation af annoncer', () => {
  it('afvis og fjern kræver en begrundelse, som gemmes til sælgeren sammen med medarbejderen', async () => {
    const me = await staff(), id = await listing(await user());
    expect(await moderate(db, me, id, 'reject', 'kort')).toEqual({ ok: false, error: 'note_required' });
    expect(await moderate(db, me, id, 'remove', 'Varen må ikke sælges på Videro.')).toEqual({ ok: true });
    const r = await row(id);
    expect(r).toMatchObject({ status: 'removed', moderationStatus: 'rejected', moderationNote: 'Varen må ikke sælges på Videro.', moderatedBy: me });
    // Fortryd
    expect(await moderate(db, me, id, 'restore', '')).toEqual({ ok: true });
    expect(await row(id)).toMatchObject({ status: 'active', moderationStatus: 'approved', moderationNote: null });
  });

  it('reserverede annoncer (med ordre) kan ikke fjernes; ukendte id\'er afvises', async () => {
    const me = await staff(), id = await listing(await user(), { status: 'reserved' });
    expect(await moderate(db, me, id, 'remove', 'Forsøg på at fjerne')).toEqual({ ok: false, error: 'invalid_state' });
    expect(await moderate(db, me, 'ikke-et-id', 'approve', '')).toEqual({ ok: false, error: 'not_found' });
  });

  it('send til gennemgang skjuler annoncen; godkend viser den igen', async () => {
    const me = await staff(), id = await listing(await user());
    await moderate(db, me, id, 'to_review', '');
    expect((await row(id))!.moderationStatus).toBe('pending');
    await moderate(db, me, id, 'approve', '');
    expect((await row(id))!.moderationStatus).toBe('approved');
  });

  it('flyt kategori: kun gyldige kombinationer fra kategoritræet', async () => {
    const me = await staff(), id = await listing(await user());
    expect(await recategorize(db, me, id, 'maend', 'Sneakers')).toBe(true);
    expect(await row(id)).toMatchObject({ category: 'maend', subcategory: 'Sneakers' });
    expect(await recategorize(db, me, id, 'maend', 'Kjoler')).toBe(false);
    expect(await recategorize(db, me, id, 'sko', '')).toBe(false);
  });

  it('slet permanent: billeder følger med; annoncer med ordrer kan ikke slettes', async () => {
    const seller = await user(), id = await listing(seller);
    await db.insert(s.listingImages).values({ ownerId: seller, listingId: id, storageKey: `l/${id}.webp`, contentType: 'image/webp', bytes: 10, position: 0, scanStatus: 'clean' });
    expect(await deleteListing(db, id)).toMatchObject({ ok: true, title: 'Uldfrakke fra Ganni', sellerId: seller });
    expect(await row(id)).toBeUndefined();
    expect(await db.select().from(s.listingImages).where(eq(s.listingImages.listingId, id))).toHaveLength(0);
    expect(await deleteListing(db, id)).toEqual({ ok: false, error: 'not_found' });
  });
});

describe('advarsler og anmeldelser', () => {
  it('advarsler tælles op og knyttes til annoncen; ugyldige afvises', async () => {
    const me = await staff(), seller = await user(), id = await listing(seller);
    expect(await warnUser(db, me, { userId: seller, reason: 'off_platform', message: 'Skriv ikke dit telefonnummer i annoncen.', listingId: id })).toEqual({ ok: true, total: 1 });
    expect(await warnUser(db, me, { userId: seller, reason: 'spam', message: 'Dubletter er ikke tilladt.' })).toEqual({ ok: true, total: 2 });
    expect(await warnUser(db, me, { userId: seller, reason: 'findes-ikke', message: 'Hej med dig' })).toEqual({ ok: false, error: 'invalid' });
    expect(await warnUser(db, me, { userId: seller, reason: 'spam', message: 'kort' })).toEqual({ ok: false, error: 'invalid' });
    const ws = await warningsForUser(db, seller);
    expect(ws.map((w) => w.reason)).toEqual(['spam', 'off_platform']);
    expect(ws[1]!.listingTitle).toBe('Uldfrakke fra Ganni');
    expect((await getListingAdmin(db, id))!.sellerWarnings).toBe(2);
  });

  it('anmeldelser vises med annoncen og lukkes samlet, når der er handlet', async () => {
    const me = await staff(), seller = await user(), a = await user(), b = await user(), id = await listing(seller);
    await db.insert(s.reports).values([{ reporterId: a, targetType: 'listing', targetId: id, reason: 'scam: Vil have MobilePay' }, { reporterId: b, targetType: 'listing', targetId: id, reason: 'other' }]);
    const open = (await openReportsDetailed(db)).filter((r) => r.targetId === id);
    expect(open).toHaveLength(2);
    expect(open[0]!.listing?.title).toBe('Uldfrakke fra Ganni');
    expect(open[0]!.sameTarget).toBe(2);
    expect((await searchListings(db, { reported: true })).rows.map((r) => r.id)).toContain(id);
    expect(await closeReportsFor(db, me, id, 'actioned')).toBe(2);
    expect((await openReportsDetailed(db)).filter((r) => r.targetId === id)).toHaveLength(0);
  });

  it('søgning i annoncer: titel, sælger og filtre', async () => {
    const id = await listing(await user(), { title: 'Sjælden vinylplade', category: 'underholdning', subcategory: 'Vinylplader' });
    expect((await searchListings(db, { q: 'vinylplade' })).rows.map((r) => r.id)).toEqual([id]);
    expect((await searchListings(db, { q: 'vinylplade', category: 'kvinder' })).rows).toHaveLength(0);
    expect((await searchListings(db, { q: id })).rows.map((r) => r.id)).toEqual([id]);
  });
});

describe('statistik', () => {
  it('tæller visninger, unikke besøgende pr. dag, søgninger uden resultater og klik', async () => {
    const id = await listing(await user(), { title: 'Populær jakke' });
    await db.insert(s.analyticsEvents).values([
      { type: 'pageview', path: '/', device: 'mobile', visitor: 'aaaaaaaaaaaaaaaa', referrerHost: 'google.com' },
      { type: 'pageview', path: '/', device: 'mobile', visitor: 'aaaaaaaaaaaaaaaa' },
      { type: 'pageview', path: '/kategori/kvinder/', device: 'desktop', visitor: 'bbbbbbbbbbbbbbbb' },
      { type: 'listing_view', path: `/annonce/${id}/`, listingId: id, category: 'kvinder', device: 'desktop', visitor: 'bbbbbbbbbbbbbbbb' },
      { type: 'search', path: '/soeg/', value: 'Trenchcoat', num: 0, device: 'mobile', visitor: 'aaaaaaaaaaaaaaaa' },
      { type: 'click', path: '/', value: 'hero_sell', device: 'mobile', visitor: 'aaaaaaaaaaaaaaaa' },
      { type: 'favorite', path: '/', listingId: id, num: 1, device: 'mobile', visitor: 'aaaaaaaaaaaaaaaa' }
    ]);
    const a = await analytics(db, 7);
    expect(a.totals).toMatchObject({ pageviews: 3, visitors: 2, listingViews: 1, searches: 1, clicks: 1, favorites: 1 });
    expect(a.zeroResults).toEqual([{ q: 'trenchcoat', n: 1 }]);
    expect(a.listings[0]).toMatchObject({ id, title: 'Populær jakke', views: 1, favorites: 1 });
    expect(a.pages[0]).toMatchObject({ path: '/', n: 2, visitors: 1 });
    expect(a.referrers.find((r) => r.host === 'google.com')?.n).toBe(1);
    expect(a.daily).toHaveLength(7);
    expect(a.categories.find((c) => c.category === 'kvinder')).toMatchObject({ views: 1, listingViews: 1 });
  });
});
