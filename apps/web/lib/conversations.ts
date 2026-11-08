import 'server-only';
/**
 * Beskeder og bud mellem køber og sælger.
 *
 * Regler:
 *  - En samtale hører til én annonce og én køber (sælgeren er annoncens ejer). Kun de to kan se og skrive.
 *    Alt andet – også forkert id-format – er "findes ikke" (ingen forskel på "findes ikke" og "ikke din").
 *  - Man kan ikke skrive til sig selv eller om annoncer, der ikke er til salg.
 *  - Beskeder vurderes med assessMessageRisk(): betaling/kontakt uden om Videro markeres, og modtageren får en advarsel.
 *  - Bud: mellem 40 % og under fuld pris, gælder i 48 timer, højst ét åbent pr. køber og annonce (også i databasen).
 *    Sælgeren accepterer/afviser, køberen kan trække det tilbage. Hver handling bliver også en linje i samtalen.
 */
import { and, desc, eq, inArray, lt, or, sql } from 'drizzle-orm';
import { z } from 'zod';
import { schema, type Db } from '@respin/db';
import { assessMessageRisk, normalizeUserText } from '@respin/core';
import { thumbKey, type ImageStore } from './image-store';

const { conversations, messages, offers, listings, listingImages, users } = schema;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export const OFFER_MIN_SHARE = 0.4;
export const OFFER_HOURS = 48;
export const MESSAGE_MAX = 2000;

export type MessageError = 'not_found' | 'own_listing' | 'not_for_sale' | 'invalid_body' | 'invalid_amount' | 'offer_exists' | 'invalid_state';
export type Result<T = object> = ({ ok: true } & T) | { ok: false; error: MessageError };

const kr = (ore: number) => `${(ore / 100).toLocaleString('da-DK', { minimumFractionDigits: ore % 100 ? 2 : 0, maximumFractionDigits: 2 })} kr.`;

/* ------------------------------ Samtaler ------------------------------ */

/** Find eller opret samtalen om en annonce. Kun for annoncer, der er til salg, og ikke for ens egne. */
export async function startConversation(db: Db, buyerId: string, listingId: string): Promise<Result<{ id: string }>> {
  if (!UUID.test(listingId)) return { ok: false, error: 'not_found' };
  const [l] = await db.select({ sellerId: listings.sellerId, status: listings.status, moderation: listings.moderationStatus, sellerStatus: users.status })
    .from(listings).innerJoin(users, eq(users.id, listings.sellerId)).where(eq(listings.id, listingId));
  if (!l) return { ok: false, error: 'not_found' };
  if (l.sellerId === buyerId) return { ok: false, error: 'own_listing' };
  const [existing] = await db.select({ id: conversations.id }).from(conversations).where(and(eq(conversations.listingId, listingId), eq(conversations.buyerId, buyerId)));
  if (existing) return { ok: true, id: existing.id };
  if (l.status !== 'active' || l.moderation !== 'approved' || l.sellerStatus !== 'active') return { ok: false, error: 'not_for_sale' };
  const [c] = await db.insert(conversations).values({ listingId, buyerId, sellerId: l.sellerId }).onConflictDoNothing().returning({ id: conversations.id });
  if (c) return { ok: true, id: c.id };
  const [again] = await db.select({ id: conversations.id }).from(conversations).where(and(eq(conversations.listingId, listingId), eq(conversations.buyerId, buyerId)));
  return again ? { ok: true, id: again.id } : { ok: false, error: 'not_found' };
}

/** Køberens eksisterende samtale om annoncen (uden at oprette en) */
export async function findConversation(db: Db, buyerId: string, listingId: string): Promise<string | null> {
  if (!UUID.test(listingId)) return null;
  const [c] = await db.select({ id: conversations.id }).from(conversations).where(and(eq(conversations.listingId, listingId), eq(conversations.buyerId, buyerId)));
  return c?.id ?? null;
}

/** Annoncen, man vil skrive om (siden "Skriv til sælger"). null = findes ikke. */
export async function listingToMessage(db: Db, store: ImageStore, listingId: string) {
  if (!UUID.test(listingId)) return null;
  const [l] = await db.select({ id: listings.id, title: listings.title, priceOre: listings.priceOre, status: listings.status, moderation: listings.moderationStatus,
    sellerId: listings.sellerId, sellerName: users.displayName, sellerStatus: users.status,
    cover: sql<string | null>`(select storage_key from ${listingImages} li where li.listing_id = listings.id order by li.position limit 1)` })
    .from(listings).innerJoin(users, eq(users.id, listings.sellerId)).where(eq(listings.id, listingId));
  if (!l) return null;
  const { cover, ...rest } = l;
  return { ...rest, image: cover ? store.urlFor(thumbKey(cover)) : null, forSale: l.status === 'active' && l.moderation === 'approved' && l.sellerStatus === 'active' };
}

/** Første besked om en annonce: samtalen oprettes først, når der faktisk er skrevet noget (ingen tomme samtaler). */
export async function sendFirstMessage(db: Db, buyerId: string, listingId: string, raw: string, now = new Date()): Promise<Result<{ id: string }>> {
  if (!bodyInput.safeParse(raw).success) return { ok: false, error: 'invalid_body' };
  const c = await startConversation(db, buyerId, listingId);
  if (!c.ok) return c;
  const m = await sendMessage(db, buyerId, c.id, raw, now);
  return m.ok ? { ok: true, id: c.id } : m;
}

/** Samtalen, hvis brugeren er køber eller sælger – ellers null */
async function participant(db: Db, userId: string, conversationId: string) {
  if (!UUID.test(conversationId)) return null;
  const [c] = await db.select().from(conversations).where(and(eq(conversations.id, conversationId), or(eq(conversations.buyerId, userId), eq(conversations.sellerId, userId))));
  return c ? { ...c, role: (c.buyerId === userId ? 'buyer' : 'seller') as 'buyer' | 'seller' } : null;
}

const bodyInput = z.string().max(MESSAGE_MAX * 4).transform(normalizeUserText).pipe(z.string().min(1).max(MESSAGE_MAX));

async function addMessage(tx: Db, c: { id: string; role: 'buyer' | 'seller' }, senderId: string, body: string, kind: string, offerId: string | null, now: Date) {
  const risk = kind === 'text' ? assessMessageRisk(body).level : 'low';
  const [m] = await tx.insert(messages).values({ conversationId: c.id, senderId, body, riskLevel: risk, kind, offerId, createdAt: now }).returning({ id: messages.id });
  await tx.update(conversations).set({ lastMessageAt: now, ...(c.role === 'buyer' ? { buyerReadAt: now } : { sellerReadAt: now }) }).where(eq(conversations.id, c.id));
  return { id: m!.id, risk };
}

export async function sendMessage(db: Db, userId: string, conversationId: string, raw: string, now = new Date()): Promise<Result<{ id: string; risk: string }>> {
  const c = await participant(db, userId, conversationId);
  if (!c) return { ok: false, error: 'not_found' };
  const body = bodyInput.safeParse(raw);
  if (!body.success) return { ok: false, error: 'invalid_body' };
  const m = await db.transaction((tx) => addMessage(tx as unknown as Db, c, userId, body.data, 'text', null, now));
  return { ok: true, ...m };
}

/* ------------------------------ Bud ------------------------------ */

/** Udløb bud, der er for gamle (kaldes, før bud vises eller ændres) */
async function expireOffers(db: Db, listingId: string, now: Date) {
  await db.update(offers).set({ status: 'expired', respondedAt: now }).where(and(eq(offers.listingId, listingId), eq(offers.status, 'pending'), lt(offers.expiresAt, now)));
}

/** Giv et bud. Opretter samtalen, hvis den ikke findes. */
export async function makeOffer(db: Db, buyerId: string, listingId: string, amountOre: number, now = new Date()): Promise<Result<{ conversationId: string; offerId: string }>> {
  const conv = await startConversation(db, buyerId, listingId);
  if (!conv.ok) return conv;
  const [l] = await db.select({ priceOre: listings.priceOre, status: listings.status }).from(listings).where(eq(listings.id, listingId));
  if (!l || l.status !== 'active') return { ok: false, error: 'not_for_sale' };
  if (!Number.isInteger(amountOre) || amountOre < Math.max(100, Math.ceil(l.priceOre * OFFER_MIN_SHARE)) || amountOre >= l.priceOre) return { ok: false, error: 'invalid_amount' };
  await expireOffers(db, listingId, now);
  try {
    return await db.transaction(async (tx) => {
      const [o] = await tx.insert(offers).values({ listingId, buyerId, amountOre, expiresAt: new Date(now.getTime() + OFFER_HOURS * 3_600_000), createdAt: now }).returning({ id: offers.id });
      await addMessage(tx as unknown as Db, { id: conv.id, role: 'buyer' }, buyerId, `Bud: ${kr(amountOre)} (listepris ${kr(l.priceOre)})`, 'offer', o!.id, now);
      return { ok: true as const, conversationId: conv.id, offerId: o!.id };
    });
  } catch (e) {
    // Det delvise unikke indeks: der er allerede et åbent bud
    if (e instanceof Error && /offers_one_pending|unique/i.test(`${e.message} ${(e as { cause?: Error }).cause?.message ?? ''}`)) return { ok: false, error: 'offer_exists' };
    throw e;
  }
}

/**
 * Svar på eller træk et bud tilbage:
 *  - accept/decline: kun sælgeren, kun åbne bud
 *  - withdraw: kun køberen, kun åbne bud
 */
export async function respondToOffer(db: Db, userId: string, offerId: string, action: 'accept' | 'decline' | 'withdraw', now = new Date()): Promise<Result<{ conversationId: string }>> {
  if (!UUID.test(offerId)) return { ok: false, error: 'not_found' };
  const [o] = await db.select({ id: offers.id, listingId: offers.listingId, buyerId: offers.buyerId, amountOre: offers.amountOre, status: offers.status, expiresAt: offers.expiresAt, sellerId: listings.sellerId })
    .from(offers).innerJoin(listings, eq(listings.id, offers.listingId)).where(eq(offers.id, offerId));
  if (!o || (o.buyerId !== userId && o.sellerId !== userId)) return { ok: false, error: 'not_found' };
  const isSeller = o.sellerId === userId;
  if ((action === 'withdraw') === isSeller) return { ok: false, error: 'not_found' };
  if (o.status !== 'pending' || o.expiresAt < now) { await expireOffers(db, o.listingId, now); return { ok: false, error: 'invalid_state' }; }
  const [conv] = await db.select({ id: conversations.id }).from(conversations).where(and(eq(conversations.listingId, o.listingId), eq(conversations.buyerId, o.buyerId)));
  if (!conv) return { ok: false, error: 'not_found' };
  const status = action === 'accept' ? 'accepted' : action === 'decline' ? 'declined' : 'withdrawn';
  const text = action === 'accept' ? `Bud på ${kr(o.amountOre)} accepteret` : action === 'decline' ? `Bud på ${kr(o.amountOre)} afvist` : `Bud på ${kr(o.amountOre)} trukket tilbage`;
  return db.transaction(async (tx) => {
    const r = await tx.update(offers).set({ status, respondedAt: now }).where(and(eq(offers.id, offerId), eq(offers.status, 'pending'))).returning({ id: offers.id });
    if (r.length !== 1) return { ok: false as const, error: 'invalid_state' as const };
    await addMessage(tx as unknown as Db, { id: conv.id, role: isSeller ? 'seller' : 'buyer' }, userId, text, `offer_${status}`, offerId, now);
    return { ok: true as const, conversationId: conv.id };
  });
}

/* ------------------------------ Læsning ------------------------------ */

export interface InboxRow {
  id: string; listingId: string; listingTitle: string; listingPriceOre: number; listingStatus: string; image: string | null;
  otherName: string; role: 'buyer' | 'seller'; lastMessageAt: Date; preview: string; unread: boolean;
}

/** Brugerens samtaler, nyeste først, med sidste besked og ulæst-markering */
export async function inbox(db: Db, store: ImageStore, userId: string): Promise<InboxRow[]> {
  const rows = await db.select({
    id: conversations.id, listingId: listings.id, listingTitle: listings.title, listingPriceOre: listings.priceOre, listingStatus: listings.status,
    buyerId: conversations.buyerId, buyerReadAt: conversations.buyerReadAt, sellerReadAt: conversations.sellerReadAt, lastMessageAt: conversations.lastMessageAt,
    buyerName: sql<string>`(select display_name from ${users} where id = ${conversations.buyerId})`,
    sellerName: sql<string>`(select display_name from ${users} where id = ${conversations.sellerId})`,
    preview: sql<string | null>`(select body from ${messages} m where m.conversation_id = ${conversations.id} order by m.created_at desc limit 1)`,
    lastSender: sql<string | null>`(select sender_id from ${messages} m where m.conversation_id = ${conversations.id} order by m.created_at desc limit 1)`,
    cover: sql<string | null>`(select storage_key from ${listingImages} li where li.listing_id = listings.id order by li.position limit 1)`
  }).from(conversations).innerJoin(listings, eq(listings.id, conversations.listingId))
    .where(or(eq(conversations.buyerId, userId), eq(conversations.sellerId, userId)))
    .orderBy(desc(conversations.lastMessageAt)).limit(200);
  return rows.filter((r) => r.preview !== null).map((r) => {
    const role = r.buyerId === userId ? 'buyer' : 'seller';
    const readAt = role === 'buyer' ? r.buyerReadAt : r.sellerReadAt;
    return {
      id: r.id, listingId: r.listingId, listingTitle: r.listingTitle, listingPriceOre: r.listingPriceOre, listingStatus: r.listingStatus,
      image: r.cover ? store.urlFor(thumbKey(r.cover)) : null, otherName: role === 'buyer' ? r.sellerName : r.buyerName, role,
      lastMessageAt: r.lastMessageAt, preview: (r.preview ?? '').slice(0, 140),
      unread: !!r.lastSender && r.lastSender !== userId && (!readAt || readAt < r.lastMessageAt)
    };
  });
}

/** Antal samtaler med ulæste beskeder (prik i menuen) */
export async function unreadConversations(db: Db, userId: string): Promise<number> {
  const [r] = await db.select({ n: sql<number>`count(*)`.mapWith(Number) }).from(conversations).where(and(
    or(eq(conversations.buyerId, userId), eq(conversations.sellerId, userId)),
    sql`exists (select 1 from ${messages} m where m.conversation_id = ${conversations.id} and m.sender_id <> ${userId}
      and m.created_at > coalesce(case when ${conversations.buyerId} = ${userId} then ${conversations.buyerReadAt} else ${conversations.sellerReadAt} end, 'epoch'::timestamptz))`
  ));
  return r?.n ?? 0;
}

export interface ThreadMessage { id: string; mine: boolean; body: string; kind: string; risk: string; offerId: string | null; createdAt: Date }
export interface ThreadOffer { id: string; amountOre: number; status: string; expiresAt: Date; createdAt: Date }

/** Én samtale med beskeder og bud. Markerer den som læst for brugeren. */
export async function getThread(db: Db, store: ImageStore, userId: string, conversationId: string, now = new Date()) {
  const c = await participant(db, userId, conversationId);
  if (!c) return null;
  await expireOffers(db, c.listingId, now);
  const [[l], other, msgs, offs] = await Promise.all([
    db.select({ id: listings.id, title: listings.title, priceOre: listings.priceOre, status: listings.status, moderation: listings.moderationStatus,
      cover: sql<string | null>`(select storage_key from ${listingImages} li where li.listing_id = listings.id order by li.position limit 1)` })
      .from(listings).where(eq(listings.id, c.listingId)),
    db.select({ name: users.displayName, username: users.username, status: users.status }).from(users).where(eq(users.id, c.role === 'buyer' ? c.sellerId : c.buyerId)),
    db.select({ id: messages.id, senderId: messages.senderId, body: messages.body, kind: messages.kind, risk: messages.riskLevel, offerId: messages.offerId, createdAt: messages.createdAt })
      .from(messages).where(eq(messages.conversationId, c.id)).orderBy(messages.createdAt).limit(500),
    db.select({ id: offers.id, amountOre: offers.amountOre, status: offers.status, expiresAt: offers.expiresAt, createdAt: offers.createdAt })
      .from(offers).where(and(eq(offers.listingId, c.listingId), eq(offers.buyerId, c.buyerId))).orderBy(desc(offers.createdAt)).limit(50)
  ]);
  if (!l) return null;
  await db.update(conversations).set(c.role === 'buyer' ? { buyerReadAt: now } : { sellerReadAt: now }).where(eq(conversations.id, c.id));
  return {
    id: c.id, role: c.role,
    listing: { ...l, image: l.cover ? store.urlFor(thumbKey(l.cover)) : null },
    other: other[0] ?? { name: 'Slettet bruger', username: null, status: 'deleted' },
    messages: msgs.map((m): ThreadMessage => ({ id: m.id, mine: m.senderId === userId, body: m.body, kind: m.kind, risk: m.risk, offerId: m.offerId, createdAt: m.createdAt })),
    offers: offs as ThreadOffer[],
    pendingOffer: (offs as ThreadOffer[]).find((o) => o.status === 'pending') ?? null,
    acceptedOffer: (offs as ThreadOffer[]).find((o) => o.status === 'accepted') ?? null
  };
}

/** Til tests og oprydning: alle bud på en annonce */
export const offersFor = (db: Db, listingId: string) => db.select().from(offers).where(inArray(offers.listingId, [listingId]));
