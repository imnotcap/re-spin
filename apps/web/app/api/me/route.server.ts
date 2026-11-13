import { NextResponse } from 'next/server';
import { getCurrentSession } from '../../../lib/auth';
import { getDb } from '../../../lib/server';
import { ownListingIds } from '../../../lib/listings';
import { unreadConversations } from '../../../lib/conversations';
import { profileFor, profileImageUrl } from '../../../lib/profile';
import { getImageStore } from '../../../lib/image-store';
import { latestUnreadMessage, notesFor, touchPresence, type LiveMessage, type LiveNote } from '../../../lib/live';
import { favoriteIds } from '../../../lib/favorites-server';

/**
 * Hvem er logget ind? Bruges af headeren, bundmenuen, varekortene og notifikationerne (hentes hvert 20. sekund, mens
 * siden er åben – det registrerer også, at brugeren er på siden, så nye beskeder ikke giver mail). Returnerer navn,
 * egne annoncer (ingen hjerte på dem), gemte favoritter, profilbillede, ulæste samtaler, nyeste ulæste besked og
 * notifikationer – aldrig e-mail eller bruger-id. Må aldrig caches. Ingen session eller en fejl → null.
 */
export async function GET() {
  let body: { name: string; listingIds: string[]; unread: number; avatar: string | null; favorites: string[]; message: LiveMessage | null; notes: { unread: number; items: LiveNote[] } } | null = null;
  try {
    const s = await getCurrentSession();
    if (s) {
      const db = getDb();
      const [listingIds, unread, profile, favorites, message, notes] = await Promise.all([
        ownListingIds(db, s.user.id).catch(() => []), unreadConversations(db, s.user.id).catch(() => 0), profileFor(db, s.user.id).catch(() => null),
        favoriteIds(db, s.user.id).catch(() => []), latestUnreadMessage(db, s.user.id).catch(() => null), notesFor(db, s.user.id).catch(() => ({ unread: 0, items: [] })),
        touchPresence(db, s.user.id).catch(() => undefined)
      ]);
      body = { name: s.user.displayName, listingIds, unread, avatar: profileImageUrl(getImageStore(), profile?.avatarKey), favorites, message, notes };
    }
  } catch {
    body = null;
  }
  return NextResponse.json(body, { headers: { 'Cache-Control': 'no-store, private', Vary: 'Cookie' } });
}
