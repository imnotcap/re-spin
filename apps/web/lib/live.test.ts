import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { schema, type Db } from '@respin/db';
import { createTestDb } from '@respin/db/testing';
import { MemoryMailer } from '@respin/auth';
import { MemoryImageStore, newImageKey } from './image-store';
import { createListing, saveProcessedImage, getListing } from './listings';
import { sendMessage, startConversation } from './conversations';
import { notifyNewMessage, ONLINE_MS } from './notifications';
import { latestUnreadMessage, markNotesRead, notesFor, touchPresence } from './live';
import { favoriteCounts, favoriteIds, setFavorite, syncFavorites } from './favorites-server';
import { checkNewConversation } from './spam';
import { searchMembers } from './profile';
import { parseMe } from './me';

let db: Db, close: () => Promise<void>;
const store = new MemoryImageStore();
beforeAll(async () => { ({ db, close } = await createTestDb()); });
afterAll(async () => { await close(); });

let n = 0;
async function user(name = 'Bruger', extra: Partial<typeof schema.users.$inferInsert> = {}) {
  const i = ++n;
  const [u] = await db.insert(schema.users).values({ email: `l${i}@example.dk`, emailNormalized: `l${i}@example.dk`, displayName: `${name} ${i}`, emailVerifiedAt: new Date(), ...extra }).returning();
  return u!.id;
}
async function listing(sellerId: string, title = 'Uldfrakke') {
  const id = crypto.randomUUID();
  await saveProcessedImage(db, store, sellerId, { id, key: newImageKey(id), main: Buffer.from('m'), thumb: Buffer.from('t'), width: 10, height: 10 });
  const r = await createListing(db, sellerId, { title, description: '', category: 'kvinder', condition: 'very_good', priceOre: 50_000, shippingSize: 'small', imageKeys: [id] });
  if (!r.ok) throw new Error(r.error);
  return r.id;
}

describe('spam i beskeder', () => {
  it('den samme lange besked til mange forskellige samtaler afvises; korte hilsner er ok', async () => {
    const bot = await user('Bot');
    const text = 'Køb billige ure her – skriv til mig på telefon';
    const convs = [];
    for (let i = 0; i < 5; i++) { const s = await user('Sælger'); const c = await startConversation(db, bot, await listing(s)); if (!c.ok) throw new Error(); convs.push(c.id); }
    for (let i = 0; i < 3; i++) expect((await sendMessage(db, bot, convs[i]!, text)).ok).toBe(true);
    expect(await sendMessage(db, bot, convs[3]!, text)).toEqual({ ok: false, error: 'duplicate' });
    expect((await sendMessage(db, bot, convs[3]!, 'Hej!')).ok).toBe(true); // kort – ingen grænse
    expect((await sendMessage(db, bot, convs[0]!, text)).ok).toBe(true); // samme samtale igen er ok
  });

  it('nye konti kan kun starte få samtaler i timen', async () => {
    const fresh = await user('Ny');
    const results = [];
    for (let i = 0; i < 6; i++) results.push(await checkNewConversation(db, fresh));
    expect(results.slice(0, 5)).toEqual([null, null, null, null, null]);
    expect(results[5]).toMatch(/Nye konti/);
    const old = await user('Gammel', { createdAt: new Date(Date.now() - 3 * 86_400_000) });
    for (let i = 0; i < 6; i++) expect(await checkNewConversation(db, old)).toBeNull();
  });
});

describe('mail ved ny besked', () => {
  it('mail med det samme, når modtageren ikke er på siden – ikke når hen er, og højst én pr. kvarter', async () => {
    const seller = await user('Sælger'), buyer = await user('Køber'), l = await listing(seller, 'Levi’s 501');
    const c = await startConversation(db, buyer, l); if (!c.ok) throw new Error();
    const mailer = new MemoryMailer();
    const t0 = new Date('2026-11-13T10:00:00Z');
    // Sælgeren er på siden lige nu → ingen mail
    await touchPresence(db, seller, t0);
    await sendMessage(db, buyer, c.id, 'Er de stadig til salg?', t0);
    expect(await notifyNewMessage(db, mailer, 'https://videro.dk', c.id, buyer, new Date(t0.getTime() + 1000))).toBe('online');
    expect(mailer.sent).toHaveLength(0);
    // Sælgeren har ikke været på siden i 2 min → mail
    const t1 = new Date(t0.getTime() + ONLINE_MS + 30_000);
    expect(await notifyNewMessage(db, mailer, 'https://videro.dk', c.id, buyer, t1)).toBe('sent');
    expect(mailer.sent[0]!.to).toMatch(/@example\.dk$/);
    expect(mailer.sent[0]!.html).toContain('Er de stadig til salg?');
    // Ny besked lige efter → ingen ny mail inden for et kvarter
    await sendMessage(db, buyer, c.id, 'Og hvad er længden?', new Date(t1.getTime() + 1000));
    expect(await notifyNewMessage(db, mailer, 'https://videro.dk', c.id, buyer, new Date(t1.getTime() + 2000))).toBe('throttled');
    expect(mailer.sent).toHaveLength(1);
    // En fremmed kan ikke udløse mails
    expect(await notifyNewMessage(db, mailer, 'https://videro.dk', c.id, await user('Fremmed'), t1)).toBe('skipped');
  });

  it('nyeste ulæste besked til notifikationen på siden', async () => {
    const seller = await user('Sælger'), buyer = await user('Køber'), l = await listing(seller);
    const c = await startConversation(db, buyer, l); if (!c.ok) throw new Error();
    expect(await latestUnreadMessage(db, seller)).toBeNull();
    await sendMessage(db, buyer, c.id, 'Hej, kan du sende i morgen?');
    expect(await latestUnreadMessage(db, seller)).toMatchObject({ conversationId: c.id, preview: 'Hej, kan du sende i morgen?' });
    expect(await latestUnreadMessage(db, buyer)).toBeNull(); // egne beskeder tæller ikke
  });

  it('tilstedeværelse skrives højst én gang i minuttet', async () => {
    const u = await user();
    const t0 = new Date('2026-11-13T10:00:00Z');
    await touchPresence(db, u, t0);
    await touchPresence(db, u, new Date(t0.getTime() + 30_000));
    const [r] = await db.select({ at: schema.users.lastSeenAt }).from(schema.users).where(eq(schema.users.id, u));
    expect(r!.at!.toISOString()).toBe(t0.toISOString());
  });
});

describe('favoritter', () => {
  it('antal, notifikation til sælgeren (én gang pr. døgn pr. person) og ingen favorit på egne annoncer', async () => {
    const seller = await user('Sælger'), a = await user('A'), b = await user('B'), l = await listing(seller, 'Ganni jakke');
    expect(await setFavorite(db, seller, l, true)).toBe(false); // egen annonce
    expect(await setFavorite(db, a, l, true)).toBe(true);
    expect(await setFavorite(db, a, l, false)).toBe(true);
    expect(await setFavorite(db, a, l, true)).toBe(true); // til/fra/til → stadig kun én notifikation
    expect(await setFavorite(db, b, l, true)).toBe(true);
    expect((await favoriteCounts(db, [l])).get(l)).toBe(2);
    expect((await getListing(db, store, l))?.favorites).toBe(2);
    const notes = await notesFor(db, seller);
    expect(notes.unread).toBe(2);
    expect(notes.items[0]).toMatchObject({ kind: 'favorite', text: '“Ganni jakke” er gemt som favorit', href: `/annonce/${l}/` });
    await markNotesRead(db, seller);
    expect((await notesFor(db, seller)).unread).toBe(0);
    expect(await setFavorite(db, a, 'ikke-et-id', true)).toBe(false);
  });

  it('browserens favoritter gemmes på serveren efter login (kun gyldige annoncer)', async () => {
    const seller = await user('Sælger'), u = await user('U'), l1 = await listing(seller), l2 = await listing(seller);
    await syncFavorites(db, u, [l1, l2, l1, 'demo-vare', crypto.randomUUID()]);
    expect((await favoriteIds(db, u)).sort()).toEqual([l1, l2].sort());
  });
});

describe('søg efter personer', () => {
  it('finder aktive brugere med profil på navn eller @profilnavn – ikke spærrede eller uden profil', async () => {
    const m = await user('Mette Søgeperson', { username: 'mette.soeg' });
    await db.update(schema.listings).set({ moderationStatus: 'approved', status: 'active' }).where(eq(schema.listings.id, await listing(m)));
    await user('Mette Søgeperson Spærret', { username: 'mette.spaerret', status: 'suspended' });
    await user('Mette Søgeperson Uden');
    const hits = await searchMembers(db, store, 'søgeperson');
    expect(hits.map((h) => h.username)).toEqual(['mette.soeg']);
    expect(hits[0]).toMatchObject({ forSale: 1 });
    expect((await searchMembers(db, store, '@mette.soeg')).map((h) => h.username)).toEqual(['mette.soeg']);
    expect(await searchMembers(db, store, 'x')).toEqual([]); // for kort
    expect(await searchMembers(db, store, '100%_')).toEqual([]); // LIKE-tegn escapes
  });
});

describe('svaret fra /api/me valideres i browseren', () => {
  it('ukendte formater og fremmede links smides væk', () => {
    const me = parseMe({
      name: 'Mette', listingIds: ['a'], unread: 2, avatar: 'javascript:alert(1)', favorites: ['12345678-1234-1234-1234-123456789abc', 'nej'],
      message: { conversationId: '12345678-1234-1234-1234-123456789abc', from: 'Jonas', preview: 'Hej', at: '2026-11-13T10:00:00Z' },
      notes: { unread: 1, items: [{ id: '1', kind: 'favorite', text: 'x', href: 'https://evil.example/', at: '2026' }, { id: '2', kind: 'favorite', text: 'y', href: '/annonce/abc/', at: '2026' }] }
    });
    expect(me?.avatar).toBeNull();
    expect(me?.favorites).toEqual(['12345678-1234-1234-1234-123456789abc']);
    expect(me?.notes.items.map((i) => i.href)).toEqual(['/annonce/abc/']);
    expect(parseMe({ name: 1 })).toBeNull();
  });
});
