import 'server-only';
/**
 * Favoritter på serveren (for indloggede): gør det muligt at vise, hvor mange der har gemt en annonce, og at give
 * sælgeren besked. Browseren har stadig sin egen liste (lib/favorites.ts), så favoritter også virker uden login.
 * Hvem der har gemt en annonce, vises aldrig – kun antallet.
 */
import { and, eq, gt, inArray, sql } from 'drizzle-orm';
import { schema, type Db } from '@respin/db';

const { favorites, listings, notifications } = schema;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
export const MAX_FAVORITES = 500;
/** Samme person, der gemmer/fjerner samme annonce igen og igen, giver højst én notifikation i døgnet */
const NOTE_REPEAT_MS = 24 * 3_600_000;

export async function favoriteIds(db: Db, userId: string): Promise<string[]> {
  const rows = await db.select({ id: favorites.listingId }).from(favorites).where(eq(favorites.userId, userId)).limit(MAX_FAVORITES);
  return rows.map((r) => r.id);
}

/** Gem eller fjern én favorit. Egne annoncer kan ikke gemmes. Nye favoritter giver sælgeren en notifikation. */
export async function setFavorite(db: Db, userId: string, listingId: string, on: boolean, now = new Date()): Promise<boolean> {
  if (!UUID.test(listingId)) return false;
  if (!on) {
    await db.delete(favorites).where(and(eq(favorites.userId, userId), eq(favorites.listingId, listingId)));
    return true;
  }
  const [l] = await db.select({ sellerId: listings.sellerId, status: listings.status }).from(listings).where(eq(listings.id, listingId));
  if (!l || l.sellerId === userId || l.status === 'removed' || l.status === 'draft') return false;
  const [{ n } = { n: 0 }] = await db.select({ n: sql<number>`count(*)`.mapWith(Number) }).from(favorites).where(eq(favorites.userId, userId));
  if (n >= MAX_FAVORITES) return false;
  const inserted = await db.insert(favorites).values({ userId, listingId, createdAt: now }).onConflictDoNothing().returning({ id: favorites.listingId });
  if (inserted.length) {
    const [recent] = await db.select({ id: notifications.id }).from(notifications).where(and(
      eq(notifications.userId, l.sellerId), eq(notifications.listingId, listingId), eq(notifications.actorId, userId),
      gt(notifications.createdAt, new Date(now.getTime() - NOTE_REPEAT_MS))
    )).limit(1);
    if (!recent) await db.insert(notifications).values({ userId: l.sellerId, kind: 'favorite', listingId, actorId: userId, createdAt: now });
  }
  return true;
}

/** Gem favoritter fra browseren på serveren (efter login) – kun gyldige id'er, højst MAX_FAVORITES i alt */
export async function syncFavorites(db: Db, userId: string, ids: readonly string[], now = new Date()): Promise<void> {
  const valid = [...new Set(ids.filter((id) => UUID.test(id)))].slice(0, MAX_FAVORITES);
  if (!valid.length) return;
  const have = new Set(await favoriteIds(db, userId));
  for (const id of valid.filter((x) => !have.has(x)).slice(0, MAX_FAVORITES - have.size)) await setFavorite(db, userId, id, true, now);
}

/** Antal, der har gemt hver annonce */
export async function favoriteCounts(db: Db, listingIds: readonly string[]): Promise<Map<string, number>> {
  if (!listingIds.length) return new Map();
  const rows = await db.select({ id: favorites.listingId, n: sql<number>`count(*)`.mapWith(Number) }).from(favorites)
    .where(inArray(favorites.listingId, [...listingIds])).groupBy(favorites.listingId);
  return new Map(rows.map((r) => [r.id, r.n]));
}
