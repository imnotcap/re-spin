import { NextResponse } from 'next/server';
import { getCurrentSession } from '../../../lib/auth';
import { getDb } from '../../../lib/server';
import { ownListingIds } from '../../../lib/listings';
import { unreadConversations } from '../../../lib/conversations';
import { profileFor, profileImageUrl } from '../../../lib/profile';
import { getImageStore } from '../../../lib/image-store';

/**
 * Hvem er logget ind? Bruges af headerens konto-knap og varekortene. Returnerer visningsnavnet og id'erne på
 * brugerens egne annoncer (så man ikke kan sætte hjerte på dem), profilbilledets adresse og antal samtaler med ulæste beskeder – aldrig e-mail eller bruger-id – og må aldrig
 * caches (svaret er personligt). Ingen session eller en fejl → null (knappen viser "Log ind").
 */
export async function GET() {
  let body: { name: string; listingIds: string[]; unread: number; avatar: string | null } | null = null;
  try {
    const s = await getCurrentSession();
    if (s) {
      const [listingIds, unread, profile] = await Promise.all([
        ownListingIds(getDb(), s.user.id).catch(() => []), unreadConversations(getDb(), s.user.id).catch(() => 0), profileFor(getDb(), s.user.id).catch(() => null)
      ]);
      body = { name: s.user.displayName, listingIds, unread, avatar: profileImageUrl(getImageStore(), profile?.avatarKey) };
    }
  } catch {
    body = null;
  }
  return NextResponse.json(body, { headers: { 'Cache-Control': 'no-store, private', Vary: 'Cookie' } });
}
