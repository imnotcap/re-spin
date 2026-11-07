import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { schema, type Db } from '@respin/db';
import { createTestDb } from '@respin/db/testing';
import { MemoryImageStore, newImageKey } from './image-store';
import { createListing, getListing, getOwnListingForEdit, likeEscape, listFeed, myListings, pendingImageCount, saveProcessedImage, setListingStatus, updateListing } from './listings';
import { parseKr } from './listing-labels';

let db: Db, close: () => Promise<void>;
const store = new MemoryImageStore();
beforeAll(async () => { ({ db, close } = await createTestDb()); });
afterAll(async () => { await close(); });

let n = 0;
async function user(name = 'Mette') {
  const i = ++n;
  const [u] = await db.insert(schema.users).values({ email: `u${i}@example.dk`, emailNormalized: `u${i}@example.dk`, displayName: name, emailVerifiedAt: new Date() }).returning();
  return u!.id;
}
async function image(ownerId: string) {
  const id = crypto.randomUUID();
  return (await saveProcessedImage(db, store, ownerId, { id, key: newImageKey(id), main: Buffer.from('main'), thumb: Buffer.from('thumb'), width: 1200, height: 1600 })).id;
}
const base = (imageKeys: string[], extra: Record<string, unknown> = {}) => ({
  title: 'Ganni uldjakke', description: 'Brugt få gange.', category: 'kvinder', subcategory: 'Jakker og frakker', brand: 'Ganni', size: 'M',
  condition: 'very_good', priceOre: 45_000, shippingSize: 'medium', imageKeys, ...extra
});

describe('oprettelse', () => {
  it('opretter en aktiv, godkendt annonce med billeder i rækkefølge, og den vises i feedet', async () => {
    const me = await user();
    const [a, b] = [await image(me), await image(me)];
    const r = await createListing(db, me, base([b, a]));
    expect(r).toMatchObject({ ok: true, moderation: 'approved' });
    if (!r.ok) return;
    const d = await getListing(db, store, r.id, null);
    expect(d?.images.map((i) => i.src)).toEqual([store.urlFor(newImageKey(b)).replace('.webp', '-480.webp'), store.urlFor(newImageKey(a)).replace('.webp', '-480.webp')]);
    expect(d).toMatchObject({ title: 'Ganni uldjakke', price: 450, condition: 'Meget god', sub: 'Jakker og frakker', isOwner: false });
    expect((await listFeed(db, store, { category: 'kvinder' })).map((c) => c.id)).toContain(r.id);
    expect(await pendingImageCount(db, me)).toBe(0);
  });

  it('afviser andres billeder, brugte billeder, dubletter og ubehandlede billeder – og efterlader intet', async () => {
    const me = await user(), other = await user();
    const theirs = await image(other);
    const before = (await db.select().from(schema.listings)).length;
    expect(await createListing(db, me, base([theirs]))).toMatchObject({ ok: false, error: 'invalid_images' });
    const mine = await image(me);
    expect(await createListing(db, me, base([mine, mine]))).toMatchObject({ ok: false, error: 'invalid_images' });
    const used = await image(me);
    expect((await createListing(db, me, base([used]))).ok).toBe(true);
    expect(await createListing(db, me, base([mine, used]))).toMatchObject({ ok: false, error: 'invalid_images' });
    const pending = await image(me);
    await db.update(schema.listingImages).set({ scanStatus: 'pending' }).where(eq(schema.listingImages.id, pending));
    expect(await createListing(db, me, base([pending]))).toMatchObject({ ok: false, error: 'invalid_images' });
    expect(await createListing(db, me, base([crypto.randomUUID()]))).toMatchObject({ ok: false, error: 'invalid_images' });
    // Kun den ene gyldige blev oprettet; det fejlede forsøg med "mine" frigav billedet igen (rollback)
    expect((await db.select().from(schema.listings)).length).toBe(before + 1);
    expect((await db.select().from(schema.listingImages).where(eq(schema.listingImages.id, mine)))[0]!.listingId).toBeNull();
  });

  it('validerer felterne', async () => {
    const me = await user(); const img = await image(me);
    expect(await createListing(db, me, base([img], { priceOre: 50 }))).toMatchObject({ ok: false, error: 'invalid_input', field: 'priceOre' });
    expect(await createListing(db, me, base([img], { title: 'ab' }))).toMatchObject({ ok: false, field: 'title' });
    expect(await createListing(db, me, base([img], { category: 'vintage' }))).toMatchObject({ ok: false, field: 'category' });
    expect(await createListing(db, me, base([img], { subcategory: 'Sneakers' }))).toMatchObject({ ok: false, error: 'invalid_subcategory' });
    expect(await createListing(db, me, base([]))).toMatchObject({ ok: false, field: 'imageKeys' });
    expect(await createListing(db, me, base([img], { sellerId: crypto.randomUUID() }))).toMatchObject({ ok: false, error: 'invalid_input' }); // ukendte felter afvises (strict)
    expect(await createListing(db, me, base([img], { title: '  Jakke​ med ‮skjult  ' }))).toMatchObject({ ok: true });
  });

  it('tekst om betaling uden om platformen sendes til gennemgang og vises ikke offentligt', async () => {
    const me = await user(); const img = await image(me);
    const r = await createListing(db, me, base([img], { description: 'Betal via MobilePay på 12345678, så sender jeg den' }));
    expect(r).toMatchObject({ ok: true, moderation: 'pending' });
    if (!r.ok) return;
    expect(await getListing(db, store, r.id, null)).toBeNull();
    expect((await getListing(db, store, r.id, me))?.moderation).toBe('pending'); // ejeren ser den
    expect((await listFeed(db, store, {})).map((c) => c.id)).not.toContain(r.id);
  });
});

describe('ændringer kræver ejerskab (IDOR)', () => {
  it('andre kan hverken redigere, markere som solgt eller fjerne – og kan ikke se forskel på "findes ikke"', async () => {
    const me = await user(), other = await user();
    const r = await createListing(db, me, base([await image(me)]));
    if (!r.ok) throw new Error();
    const { imageKeys: _, ...edit } = base([]);
    expect(await updateListing(db, other, r.id, { ...edit, priceOre: 100 })).toEqual({ ok: false, error: 'not_found' });
    expect(await setListingStatus(db, other, r.id, 'removed')).toEqual({ ok: false, error: 'not_found' });
    expect(await setListingStatus(db, other, r.id, 'sold')).toEqual({ ok: false, error: 'not_found' });
    expect(await getOwnListingForEdit(db, other, r.id)).toBeNull();
    expect(await updateListing(db, other, crypto.randomUUID(), edit)).toEqual({ ok: false, error: 'not_found' });
    expect(await updateListing(db, other, "x' OR '1'='1", edit)).toEqual({ ok: false, error: 'not_found' });
    expect((await getListing(db, store, r.id, null))?.price).toBe(450);
  });

  it('ejeren kan redigere, markere som solgt, sætte til salg igen og fjerne', async () => {
    const me = await user();
    const r = await createListing(db, me, base([await image(me)]));
    if (!r.ok) throw new Error();
    const { imageKeys: _, ...edit } = base([]);
    expect(await updateListing(db, me, r.id, { ...edit, priceOre: 39_900, title: 'Ganni uldjakke, sort' })).toEqual({ ok: true });
    expect(await getListing(db, store, r.id, null)).toMatchObject({ price: 399, title: 'Ganni uldjakke, sort' });
    expect(await setListingStatus(db, me, r.id, 'sold')).toEqual({ ok: true });
    expect((await listFeed(db, store, {})).map((c) => c.id)).not.toContain(r.id);
    expect((await getListing(db, store, r.id, null))?.status).toBe('sold'); // solgte kan stadig ses
    expect(await setListingStatus(db, me, r.id, 'sold')).toEqual({ ok: false, error: 'not_found' }); // allerede solgt
    expect(await setListingStatus(db, me, r.id, 'active')).toEqual({ ok: true });
    expect(await setListingStatus(db, me, r.id, 'removed')).toEqual({ ok: true });
    expect(await getListing(db, store, r.id, me)).toBeNull();
    expect(await updateListing(db, me, r.id, edit)).toEqual({ ok: false, error: 'not_found' });
    expect((await myListings(db, store, me)).map((l) => l.id)).not.toContain(r.id);
  });

  it('reserverede annoncer (aktiv ordre) kan ikke ændres eller fjernes af sælgeren', async () => {
    const me = await user();
    const r = await createListing(db, me, base([await image(me)]));
    if (!r.ok) throw new Error();
    await db.update(schema.listings).set({ status: 'reserved' }).where(eq(schema.listings.id, r.id));
    const { imageKeys: _, ...edit } = base([]);
    expect(await updateListing(db, me, r.id, edit)).toEqual({ ok: false, error: 'not_found' });
    expect(await setListingStatus(db, me, r.id, 'removed')).toEqual({ ok: false, error: 'not_found' });
  });

  it('spærrede brugeres annoncer forsvinder fra feed og annonceside', async () => {
    const me = await user();
    const r = await createListing(db, me, base([await image(me)]));
    if (!r.ok) throw new Error();
    await db.update(schema.users).set({ status: 'suspended' }).where(eq(schema.users.id, me));
    expect(await getListing(db, store, r.id, null)).toBeNull();
    expect((await listFeed(db, store, {})).map((c) => c.id)).not.toContain(r.id);
  });
});

describe('feed og søgning', () => {
  it('søger i titel, mærke og underkategori; alle ord skal passe; % og _ er almindelige tegn', async () => {
    const me = await user();
    const a = await createListing(db, me, base([await image(me)], { title: 'Nike Air Max 90', category: 'sko', subcategory: 'Sneakers', brand: 'Nike' }));
    const b = await createListing(db, me, base([await image(me)], { title: 'Rabat 50% på strik', category: 'kvinder', subcategory: 'Strik', brand: 'Samsøe' }));
    if (!a.ok || !b.ok) throw new Error();
    const ids = async (q: string, category?: 'sko') => (await listFeed(db, store, { q, category })).map((c) => c.id);
    expect(await ids('nike sneakers')).toContain(a.id);
    expect(await ids('nike strik')).not.toContain(a.id);
    expect(await ids('AIR', 'sko')).toEqual([a.id]);
    expect(await ids('50%')).toEqual([b.id]);
    expect(await ids('%')).toEqual([b.id]);
    expect(await ids('_')).toEqual([]);
    expect(likeEscape('a%b_c\\')).toBe('a\\%b\\_c\\\\');
    await expect(listFeed(db, store, { category: 'vintage' as 'sko' })).rejects.toThrow();
  });
});

describe('pris i kroner', () => {
  it('forstår danske skrivemåder og afviser resten', () => {
    expect(parseKr('450')).toBe(45_000);
    expect(parseKr('450,50')).toBe(45_050);
    expect(parseKr('1.250')).toBe(125_000);
    expect(parseKr('1 250 kr.')).toBe(125_000);
    expect(parseKr('12,5')).toBe(1_250);
    for (const bad of ['', 'abc', '-5', '1e5', '450,505', '0x10', '1.2.3']) expect(parseKr(bad)).toBeNull();
  });
});
