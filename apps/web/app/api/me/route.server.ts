import { NextResponse } from 'next/server';
import { getCurrentSession } from '../../../lib/auth';
import { getDb } from '../../../lib/server';
import { ownListingIds } from '../../../lib/listings';

/**
 * Hvem er logget ind? Bruges af headerens konto-knap og varekortene. Returnerer visningsnavnet og id'erne på
 * brugerens egne annoncer (så man ikke kan sætte hjerte på dem) – aldrig e-mail eller bruger-id – og må aldrig
 * caches (svaret er personligt). Ingen session eller en fejl → null (knappen viser "Log ind").
 */
export async function GET() {
  let body: { name: string; listingIds: string[] } | null = null;
  try {
    const s = await getCurrentSession();
    if (s) body = { name: s.user.displayName, listingIds: await ownListingIds(getDb(), s.user.id).catch(() => []) };
  } catch {
    body = null;
  }
  return NextResponse.json(body, { headers: { 'Cache-Control': 'no-store, private', Vary: 'Cookie' } });
}
