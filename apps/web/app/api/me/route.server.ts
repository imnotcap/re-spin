import { NextResponse } from 'next/server';
import { getCurrentSession } from '../../../lib/auth';

/**
 * Hvem er logget ind? Bruges af headerens konto-knap. Returnerer kun visningsnavnet – aldrig e-mail eller id –
 * og må aldrig caches (svaret er personligt). Ingen session eller en fejl → null (knappen viser "Log ind").
 */
export async function GET() {
  let body: { name: string } | null = null;
  try {
    const s = await getCurrentSession();
    if (s) body = { name: s.user.displayName };
  } catch {
    body = null;
  }
  return NextResponse.json(body, { headers: { 'Cache-Control': 'no-store, private', Vary: 'Cookie' } });
}
