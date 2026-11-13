import 'server-only';
/**
 * "Live" status til siden, mens den er åben (hentes via /api/me hvert 20. sekund):
 *  - registrerer at brugeren er på siden (users.last_seen_at, højst én skrivning i minuttet) – så får hen ikke mail
 *    om nye beskeder, men en notifikation på siden i stedet
 *  - nyeste ulæste besked fra en anden (til notifikationen "Ny besked fra …")
 *  - notifikationer (fx at en annonce er gemt som favorit) til klokken i headeren
 */
import { and, desc, eq, isNull, or, sql } from 'drizzle-orm';
import { schema, type Db } from '@respin/db';

const { users, conversations, messages, listings, notifications } = schema;
export const PRESENCE_WRITE_MS = 60_000;

export interface LiveMessage { conversationId: string; from: string; preview: string; at: string }
export interface LiveNote { id: string; kind: 'favorite'; text: string; href: string; at: string; read: boolean }

export async function touchPresence(db: Db, userId: string, now = new Date()): Promise<void> {
  await db.update(users).set({ lastSeenAt: now }).where(and(eq(users.id, userId),
    sql`(${users.lastSeenAt} is null or ${users.lastSeenAt} < ${new Date(now.getTime() - PRESENCE_WRITE_MS).toISOString()}::timestamptz)`));
}

/** Nyeste ulæste besked til brugeren (fra den anden part i en af brugerens samtaler) */
export async function latestUnreadMessage(db: Db, userId: string): Promise<LiveMessage | null> {
  const [m] = await db.select({
    conversationId: messages.conversationId, body: messages.body, kind: messages.kind, at: messages.createdAt, from: users.displayName
  }).from(messages)
    .innerJoin(conversations, eq(conversations.id, messages.conversationId))
    .innerJoin(users, eq(users.id, messages.senderId))
    .where(and(
      or(eq(conversations.buyerId, userId), eq(conversations.sellerId, userId)),
      sql`${messages.senderId} <> ${userId}`,
      sql`${messages.createdAt} > coalesce(case when ${conversations.buyerId} = ${userId} then ${conversations.buyerReadAt} else ${conversations.sellerReadAt} end, 'epoch'::timestamptz)`
    ))
    .orderBy(desc(messages.createdAt)).limit(1);
  if (!m) return null;
  const preview = m.kind === 'image' ? '📷 Billede' : m.kind.startsWith('offer') ? m.body : m.body.length > 90 ? `${m.body.slice(0, 90)}…` : m.body;
  return { conversationId: m.conversationId, from: m.from, preview, at: m.at.toISOString() };
}

/** De seneste notifikationer (højst 20) og antal ulæste */
export async function notesFor(db: Db, userId: string): Promise<{ unread: number; items: LiveNote[] }> {
  const rows = await db.select({ id: notifications.id, kind: notifications.kind, at: notifications.createdAt, readAt: notifications.readAt, listingId: listings.id, title: listings.title })
    .from(notifications).leftJoin(listings, eq(listings.id, notifications.listingId))
    .where(eq(notifications.userId, userId)).orderBy(desc(notifications.createdAt)).limit(20);
  const items = rows.filter((r) => r.listingId).map((r): LiveNote => ({
    id: r.id, kind: 'favorite', text: `“${r.title}” er gemt som favorit`, href: `/annonce/${r.listingId}/`, at: r.at.toISOString(), read: !!r.readAt
  }));
  const [u] = await db.select({ n: sql<number>`count(*)`.mapWith(Number) }).from(notifications).where(and(eq(notifications.userId, userId), isNull(notifications.readAt)));
  return { unread: u?.n ?? 0, items };
}

export async function markNotesRead(db: Db, userId: string, now = new Date()): Promise<void> {
  await db.update(notifications).set({ readAt: now }).where(and(eq(notifications.userId, userId), isNull(notifications.readAt)));
}
