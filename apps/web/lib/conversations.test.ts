import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { schema, type Db } from '@respin/db';
import { createTestDb } from '@respin/db/testing';
import { MemoryMailer } from '@respin/auth';
import { MemoryImageStore, newImageKey } from './image-store';
import { createListing, saveProcessedImage } from './listings';
import { findConversation, getThread, inbox, listingToMessage, makeOffer, messageImageKey, respondToOffer, sendFirstMessage, sendImage, sendMessage, startConversation, unreadConversations } from './conversations';
import { runNotifications } from './notifications';

let db: Db, close: () => Promise<void>;
const store = new MemoryImageStore();
beforeAll(async () => { ({ db, close } = await createTestDb()); });
afterAll(async () => { await close(); });

let n = 0;
async function user(name = 'Bruger') {
  const i = ++n;
  const [u] = await db.insert(schema.users).values({ email: `c${i}@example.dk`, emailNormalized: `c${i}@example.dk`, displayName: `${name} ${i}`, emailVerifiedAt: new Date() }).returning();
  return u!.id;
}
async function listing(sellerId: string, priceOre = 50_000) {
  const id = crypto.randomUUID();
  await saveProcessedImage(db, store, sellerId, { id, key: newImageKey(id), main: Buffer.from('m'), thumb: Buffer.from('t'), width: 10, height: 10 });
  const r = await createListing(db, sellerId, { title: 'Uldfrakke', description: '', category: 'kvinder', condition: 'very_good', priceOre, shippingSize: 'small', imageKeys: [id] });
  if (!r.ok) throw new Error(r.error);
  return r.id;
}

describe('samtaler og beskeder', () => {
  it('køber skriver, sælger ser ulæst og svarer; samme samtale genbruges', async () => {
    const seller = await user('Sælger'), buyer = await user('Køber'), l = await listing(seller);
    const c = await startConversation(db, buyer, l);
    expect(c.ok).toBe(true); if (!c.ok) return;
    expect(await startConversation(db, buyer, l)).toEqual({ ok: true, id: c.id });
    expect((await sendMessage(db, buyer, c.id, '  Hej! Er den stadig til salg?  ')).ok).toBe(true);
    expect(await unreadConversations(db, seller)).toBe(1);
    expect(await unreadConversations(db, buyer)).toBe(0);
    const box = await inbox(db, store, seller);
    expect(box[0]).toMatchObject({ id: c.id, role: 'seller', unread: true, preview: 'Hej! Er den stadig til salg?' });
    const t = await getThread(db, store, seller, c.id);
    expect(t?.messages.map((m) => [m.mine, m.body])).toEqual([[false, 'Hej! Er den stadig til salg?']]);
    expect(await unreadConversations(db, seller)).toBe(0); // læst
    await sendMessage(db, seller, c.id, 'Ja, den er!');
    expect(await unreadConversations(db, buyer)).toBe(1);
  });

  it('andre kan hverken se eller skrive i samtalen; man kan ikke skrive til sig selv', async () => {
    const seller = await user(), buyer = await user(), stranger = await user(), l = await listing(seller);
    const c = await startConversation(db, buyer, l); if (!c.ok) throw new Error();
    expect(await getThread(db, store, stranger, c.id)).toBeNull();
    expect(await sendMessage(db, stranger, c.id, 'Hej')).toEqual({ ok: false, error: 'not_found' });
    expect(await sendMessage(db, buyer, 'ikke-et-id', 'Hej')).toEqual({ ok: false, error: 'not_found' });
    expect(await startConversation(db, seller, l)).toEqual({ ok: false, error: 'own_listing' });
    expect(await sendMessage(db, buyer, c.id, '   ')).toEqual({ ok: false, error: 'invalid_body' });
  });

  it('beskeder om betaling uden om Videro markeres', async () => {
    const seller = await user(), buyer = await user(), l = await listing(seller);
    const c = await startConversation(db, buyer, l); if (!c.ok) throw new Error();
    expect(await sendMessage(db, seller, c.id, 'Send pengene på MobilePay til 22 33 44 55')).toMatchObject({ ok: true, risk: 'high' });
  });

  it('første besked opretter samtalen – en tom besked opretter ingenting; billeder vises i tråd og indbakke', async () => {
    const seller = await user(), buyer = await user(), l = await listing(seller);
    expect(await sendFirstMessage(db, buyer, l, '   ')).toEqual({ ok: false, error: 'invalid_body' });
    expect(await findConversation(db, buyer, l)).toBeNull();
    expect(await sendFirstMessage(db, seller, l, 'Hej')).toEqual({ ok: false, error: 'own_listing' });
    const r = await sendFirstMessage(db, buyer, l, 'Hej, hvad er målene?');
    expect(r.ok).toBe(true); if (!r.ok) return;
    expect(await findConversation(db, buyer, l)).toBe(r.id);
    expect((await sendFirstMessage(db, buyer, l, 'Og farven?'))).toEqual({ ok: true, id: r.id });
    expect((await getThread(db, store, seller, r.id))?.listing.image).toMatch(/-480\.webp$/);
    expect((await inbox(db, store, buyer))[0]?.image).toMatch(/-480\.webp$/);
    expect(await listingToMessage(db, store, l)).toMatchObject({ id: l, forSale: true, image: expect.stringMatching(/-480\.webp$/) });
    expect(await listingToMessage(db, store, 'nej')).toBeNull();
  });

  it('kun annoncer til salg: ingen ny samtale om en solgt annonce', async () => {
    const seller = await user(), buyer = await user(), l = await listing(seller);
    await db.update(schema.listings).set({ status: 'sold' }).where(eq(schema.listings.id, l));
    expect(await startConversation(db, buyer, l)).toEqual({ ok: false, error: 'not_for_sale' });
  });
});

describe('bud', () => {
  it('mellem 40 % og under fuld pris; ét åbent bud ad gangen; sælgeren accepterer', async () => {
    const seller = await user(), buyer = await user(), l = await listing(seller, 50_000);
    expect(await makeOffer(db, buyer, l, 19_900)).toEqual({ ok: false, error: 'invalid_amount' });
    expect(await makeOffer(db, buyer, l, 50_000)).toEqual({ ok: false, error: 'invalid_amount' });
    const o = await makeOffer(db, buyer, l, 40_000);
    expect(o.ok).toBe(true); if (!o.ok) return;
    expect(await makeOffer(db, buyer, l, 42_000)).toEqual({ ok: false, error: 'offer_exists' });
    expect(await respondToOffer(db, buyer, o.offerId, 'accept')).toEqual({ ok: false, error: 'not_found' }); // køber kan ikke acceptere
    expect(await respondToOffer(db, seller, o.offerId, 'accept')).toEqual({ ok: true, conversationId: o.conversationId });
    expect(await respondToOffer(db, seller, o.offerId, 'decline')).toEqual({ ok: false, error: 'invalid_state' });
    const t = await getThread(db, store, buyer, o.conversationId);
    expect(t?.acceptedOffer?.amountOre).toBe(40_000);
    expect(t?.messages.map((m) => m.kind)).toEqual(['offer', 'offer_accepted']);
  });

  it('køberen kan trække et bud tilbage og give et nyt; bud udløber efter 48 timer', async () => {
    const seller = await user(), buyer = await user(), l = await listing(seller, 30_000);
    const a = await makeOffer(db, buyer, l, 20_000); if (!a.ok) throw new Error();
    expect(await respondToOffer(db, seller, a.offerId, 'withdraw')).toEqual({ ok: false, error: 'not_found' }); // kun køberen
    expect((await respondToOffer(db, buyer, a.offerId, 'withdraw')).ok).toBe(true);
    const b = await makeOffer(db, buyer, l, 25_000); if (!b.ok) throw new Error();
    const later = new Date(Date.now() + 49 * 3_600_000);
    expect(await respondToOffer(db, seller, b.offerId, 'accept', later)).toEqual({ ok: false, error: 'invalid_state' });
    const [row] = await db.select().from(schema.offers).where(eq(schema.offers.id, b.offerId));
    expect(row!.status).toBe('expired');
  });
});

describe('mail-notifikationer', () => {
  it('beskeder: efter 2 min. ulæst, højst én pr. kvarter, mistænkelige citeres ikke; kundeservice-svar', async () => {
    const seller = await user('Ida'), buyer = await user('Mads'), l = await listing(seller);
    const c = await startConversation(db, buyer, l); if (!c.ok) throw new Error();
    const t0 = new Date();
    await sendMessage(db, buyer, c.id, 'Hej, kan du sende i morgen?', t0);
    const mailer = new MemoryMailer();
    const run = (at: Date) => runNotifications(db, mailer, 'https://videro.dk', at);
    const mine = () => mailer.sent.filter((m) => m.text.includes(c.id));
    await run(new Date(t0.getTime() + 60_000));
    expect(mine()).toHaveLength(0); // for tidligt
    const t1 = new Date(t0.getTime() + 3 * 60_000);
    await run(t1);
    expect(mine()).toHaveLength(1);
    expect(mine()[0]!.text).toContain(`https://videro.dk/konto/beskeder/${c.id}/`);
    expect(mine()[0]!.text).toContain('Hej, kan du sende i morgen?');
    expect(mine()[0]!.html).toContain(`href="https://videro.dk/konto/beskeder/${c.id}/"`); // HTML-udgave med knap
    expect(mine()[0]!.html).toContain('Hej, kan du sende i morgen?');
    // Ny besked lige efter: ingen ny mail inden for et kvarter
    await sendMessage(db, buyer, c.id, 'Betal på MobilePay 22334455', new Date(t1.getTime() + 60_000));
    await run(new Date(t1.getTime() + 5 * 60_000));
    expect(mine()).toHaveLength(1);
    const t2 = new Date(t1.getTime() + 20 * 60_000);
    await run(t2);
    expect(mine()).toHaveLength(2);
    expect(mine()[1]!.text).not.toContain('MobilePay'); // mistænkelig besked citeres ikke
    expect(mine()[1]!.html).not.toContain('MobilePay'); // heller ikke i HTML-udgaven (heller ikke som forhåndstekst)
    // Læst → ingen mail
    await getThread(db, store, seller, c.id, new Date(t2.getTime() + 1000));
    await sendMessage(db, seller, c.id, 'Ja!', new Date(t2.getTime() + 2000));
    await getThread(db, store, buyer, c.id, new Date(t2.getTime() + 3000));
    await run(new Date(t2.getTime() + 30 * 60_000));
    expect(mine()).toHaveLength(2);

    // Kundeservice
    const [cs] = await db.insert(schema.supportCases).values({ userId: buyer, subject: 'Hvor er min pakke?', category: 'order', customerUnread: true, lastStaffAt: t0 }).returning();
    const support = () => mailer.sent.filter((m) => m.subject === `Svar fra Videro kundeservice (sag #${cs!.number})`);
    await run(t2);
    expect(support()).toHaveLength(1);
    expect(support()[0]!.text).toContain(`https://videro.dk/konto/support/${cs!.number}/`);
    await run(new Date(t2.getTime() + 60_000));
    expect(support()).toHaveLength(1); // kun én gang pr. svar
  });
});

describe('billeder og læst-status', () => {
  it('billeder gemmes i lageret, vises kun for samtalens parter og står som "Billede" i indbakken', async () => {
    const seller = await user('Sælger'), buyer = await user('Køber'), stranger = await user('Fremmed'), l = await listing(seller);
    const c = await startConversation(db, buyer, l); if (!c.ok) throw new Error();
    const r = await sendImage(db, store, buyer, c.id, { main: Buffer.from('stor'), thumb: Buffer.from('lille') });
    expect(r.ok).toBe(true); if (!r.ok) return;
    const full = await messageImageKey(db, seller, r.id, 'full'), thumb = await messageImageKey(db, buyer, r.id, 'thumb');
    expect(full).toMatch(/^chat\/\d{4}\/\d{2}\/[0-9a-f-]{36}\.webp$/);
    expect(thumb).toBe(full!.replace('.webp', '-480.webp'));
    expect((await store.get(full!))?.toString()).toBe('stor');
    expect(await messageImageKey(db, stranger, r.id, 'full')).toBeNull(); // ikke part i samtalen
    expect(await messageImageKey(db, seller, 'ikke-et-id', 'full')).toBeNull();
    expect(await sendImage(db, store, stranger, c.id, { main: Buffer.from('x'), thumb: Buffer.from('x') })).toEqual({ ok: false, error: 'not_found' });
    expect((await inbox(db, store, seller))[0]).toMatchObject({ preview: '📷 Billede', unread: true });
    const t = await getThread(db, store, seller, c.id);
    expect(t?.messages.at(-1)).toMatchObject({ kind: 'image', image: true, body: '' });
  });

  it('otherReadAt fortæller, om den anden part har åbnet samtalen efter ens besked', async () => {
    const seller = await user('Sælger'), buyer = await user('Køber'), l = await listing(seller);
    const c = await startConversation(db, buyer, l); if (!c.ok) throw new Error();
    const t0 = new Date('2026-11-13T10:00:00Z');
    await sendMessage(db, buyer, c.id, 'Hej', t0);
    expect((await getThread(db, store, buyer, c.id, new Date(t0.getTime() + 1000)))?.otherReadAt).toBeNull(); // sælgeren har ikke læst
    await getThread(db, store, seller, c.id, new Date(t0.getTime() + 60_000));
    const after = await getThread(db, store, buyer, c.id, new Date(t0.getTime() + 120_000));
    expect(after!.otherReadAt!.getTime()).toBeGreaterThanOrEqual(t0.getTime());
  });
});
