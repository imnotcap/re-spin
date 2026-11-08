import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { schema, type Db } from '@respin/db';
import { createTestDb } from '@respin/db/testing';
import { MemoryImageStore, newImageKey } from './image-store';
import { createListing, listFeed, listForBrowse, myListings, ownListingIds, saveProcessedImage, siteStats, warningsFor } from './listings';
import { BOT, deviceOf, eventInput, recordEvent, visitorHash } from './analytics-server';
import { reportListing } from './report';
import { badgesFor } from './badges';

let db: Db, close: () => Promise<void>;
const store = new MemoryImageStore();
beforeAll(async () => { ({ db, close } = await createTestDb()); });
afterAll(async () => { await close(); });

let n = 0;
async function user() {
  const i = ++n;
  const [u] = await db.insert(schema.users).values({ email: `p${i}@example.dk`, emailNormalized: `p${i}@example.dk`, displayName: `Bruger ${i}`, emailVerifiedAt: new Date() }).returning();
  return u!.id;
}
async function listing(sellerId: string, extra: Record<string, unknown> = {}) {
  const id = crypto.randomUUID();
  await saveProcessedImage(db, store, sellerId, { id, key: newImageKey(id), main: Buffer.from('m'), thumb: Buffer.from('t'), width: 1200, height: 1600 });
  const r = await createListing(db, sellerId, { title: 'Uldfrakke', description: '', category: 'kvinder', subcategory: 'Frakker og jakker', brand: 'Ganni', size: 'M', condition: 'very_good', priceOre: 15_000, shippingSize: 'small', imageKeys: [id], ...extra });
  if (!r.ok) throw new Error(r.error);
  return r.id;
}

describe('annoncer fra databasen', () => {
  it('egne annoncer (til hjertet), favoritter efter id og lister til kategori/søgning', async () => {
    const me = await user(), other = await user();
    const a = await listing(me), b = await listing(other, { title: 'Vinylplader', category: 'underholdning', subcategory: 'Vinylplader', brand: 'Diverse' });
    expect(await ownListingIds(db, me)).toEqual([a]);
    expect((await listFeed(db, store, { ids: [b, crypto.randomUUID()] })).map((l) => l.id)).toEqual([b]);
    expect((await listFeed(db, store, { ids: [] }))).toEqual([]);
    expect((await listForBrowse(db, store, { category: 'underholdning' })).map((l) => l.id)).toEqual([b]);
    // "lp" er ikke i titlen, men eksemplerne for Vinylplader nævner "LP’er"
    expect((await listForBrowse(db, store, { q: 'trenchcoat' })).map((l) => l.id)).toContain(a);
  });

  it('tal til menu og forside: antal, mærker og ugens fokus pr. kategori', async () => {
    const me = await user();
    await listing(me, { title: 'Kjole', subcategory: 'Kjoler', brand: 'Samsøe Samsøe', priceOre: 10_000, condition: 'new_with_tag' });
    const st = await siteStats(db, store);
    const k = st.cats.kvinder!;
    expect(k.count).toBeGreaterThanOrEqual(2);
    expect(k.likeNew).toBeGreaterThanOrEqual(1);
    expect(k.under200).toBeGreaterThanOrEqual(1);
    expect(k.brands.map((b) => b.brand)).toContain('Samsøe Samsøe');
    expect(k.focus?.image.src).toBeTruthy();
    expect(st.brands.map((b) => b.brand)).toEqual([...st.brands.map((b) => b.brand)].sort((x, y) => x.localeCompare(y, 'da')));
  });
});

describe('anmeldelser', () => {
  it('ikke sin egen annonce, ikke dubletter, og grunden gemmes', async () => {
    const seller = await user(), me = await user(), id = await listing(seller);
    expect(await reportListing(db, seller, id, 'scam', '')).toBe('own');
    expect(await reportListing(db, me, id, 'scam', 'Vil have MobilePay')).toBe('ok');
    expect(await reportListing(db, me, id, 'other', '')).toBe('duplicate');
    expect(await reportListing(db, me, 'ikke-et-id', 'other', '')).toBe('not_found');
    const rs = await db.select().from(schema.reports).where(eq(schema.reports.targetId, id));
    expect(rs.map((r) => r.reason)).toEqual(['scam: Vil have MobilePay']);
  });
});

describe('advarsler og moderation set fra sælgeren', () => {
  it('advarsler vises og markeres som set; fjernede annoncer med begrundelse står under "Mine annoncer"', async () => {
    const me = await user(), id = await listing(me);
    const [st] = await db.insert(schema.staffUsers).values({ email: `s${++n}@videro.dk`, role: 'moderator' }).returning();
    await db.insert(schema.userWarnings).values({ userId: me, staffId: st!.id, reason: 'off_platform', message: 'Skriv ikke dit nummer i annoncen.', listingId: id });
    await db.update(schema.listings).set({ status: 'removed', moderationStatus: 'rejected', moderationNote: 'Telefonnummer i annoncen.', moderatedBy: st!.id }).where(eq(schema.listings.id, id));
    const w1 = await warningsFor(db, me);
    expect(w1).toHaveLength(1);
    expect(w1[0]).toMatchObject({ isNew: true, listingTitle: 'Uldfrakke', reasonLabel: 'Betaling eller kontakt uden om Videro' });
    expect((await warningsFor(db, me))[0]!.isNew).toBe(false);
    const mine = await myListings(db, store, me);
    expect(mine.find((l) => l.id === id)).toMatchObject({ status: 'removed', moderationNote: 'Telefonnummer i annoncen.' });
    // Fjernede annoncer er ikke "egne" længere (kan ikke ses af andre alligevel)
    expect(await ownListingIds(db, me)).not.toContain(id);
  });
});

describe('statistik uden cookies', () => {
  it('validering: kun kendte typer, stier fra roden, ingen styretegn', () => {
    expect(eventInput.safeParse({ t: 'pageview', p: '/' }).success).toBe(true);
    expect(eventInput.safeParse({ t: 'hack', p: '/' }).success).toBe(false);
    expect(eventInput.safeParse({ t: 'pageview', p: 'https://evil.dk/' }).success).toBe(false);
    expect(eventInput.safeParse({ t: 'pageview', p: '/', r: 'evil.dk/<script>' }).success).toBe(false);
    expect(eventInput.parse({ t: 'search', p: '/soeg/', value: 'jakke\u0000\n' }).value).toBe('jakke');
  });

  it('bots og målinger frasorteres; enhed afgøres af browseren', () => {
    for (const ua of ['Googlebot/2.1', 'Mozilla/5.0 Chrome-Lighthouse', 'Discordbot/2.0', 'curl/8.0', 'HeadlessChrome/120']) expect(BOT.test(ua), ua).toBe(true);
    expect(BOT.test('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Safari/604.1')).toBe(false);
    expect(deviceOf('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Mobile/15E148')).toBe('mobile');
    expect(deviceOf('Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)')).toBe('tablet');
    expect(deviceOf('Mozilla/5.0 (Linux; Android 14; SM-X710) AppleWebKit/537.36 Chrome/120 Safari/537.36')).toBe('tablet');
    expect(deviceOf('Mozilla/5.0 (Windows NT 10.0; Win64; x64)')).toBe('desktop');
  });

  it('gemmer ingen IP: kun et hash, der afhænger af dagens salt', async () => {
    await recordEvent(db, eventInput.parse({ t: 'pageview', p: '/', r: 'google.com' }), { ip: '203.0.113.7', userAgent: 'Mozilla/5.0 (iPhone)' });
    const [e] = await db.select().from(schema.analyticsEvents).orderBy(schema.analyticsEvents.id);
    expect(e).toMatchObject({ type: 'pageview', path: '/', referrerHost: 'google.com', device: 'mobile' });
    expect(e!.visitor).toMatch(/^[0-9a-f]{16}$/);
    expect(JSON.stringify(e)).not.toContain('203.0.113.7');
    const [salt] = await db.select().from(schema.analyticsSalts);
    expect(e!.visitor).toBe(visitorHash(salt!.salt, '203.0.113.7', 'Mozilla/5.0 (iPhone)'));
    expect(visitorHash('andet-salt', '203.0.113.7', 'Mozilla/5.0 (iPhone)')).not.toBe(e!.visitor);
  });
});

describe('badges', () => {
  it('beregnes ud fra annoncer, salg, kategorier, sikkerhed og profil', async () => {
    const me = await user();
    const earned = async () => (await badgesFor(db, me)).filter((b) => b.earned).map((b) => b.id);
    expect(await earned()).toEqual(['pioneer']); // oprettet før juli 2027
    const a = await listing(me);
    await listing(me, { category: 'hjem', subcategory: 'Gulvlamper' });
    await listing(me, { category: 'underholdning', subcategory: 'Vinylplader' });
    await db.update(schema.listings).set({ status: 'sold' }).where(eq(schema.listings.id, a));
    await db.update(schema.users).set({ username: `bruger${n}`, bio: 'Sælger brugt.', profileBanner: 'skov' }).where(eq(schema.users.id, me));
    await db.insert(schema.mfaTotp).values({ userId: me, secretEnc: 'x', enabledAt: new Date() } as typeof schema.mfaTotp.$inferInsert);
    expect(await earned()).toEqual(['first_listing', 'first_sale', 'secure', 'profile', 'variety', 'pioneer']);
    const s10 = (await badgesFor(db, me)).find((b) => b.id === 'seller_10')!;
    expect(s10).toMatchObject({ earned: false, progress: 3, goal: 10 });
  });
});
