import { NextResponse } from 'next/server';
import { getCurrentSession } from '../../../lib/auth';
import { getShipmondoOrNull, pickupPoints } from '../../../lib/shipping';

export const dynamic = 'force-dynamic';

/** Nærmeste pakkeshops for et postnummer (kun for indloggede – bruges i købsvinduet) */
export async function GET(req: Request) {
  const headers = { 'Cache-Control': 'private, max-age=300' };
  const client = getShipmondoOrNull();
  if (!client) return NextResponse.json({ enabled: false, points: [] }, { headers });
  if (!(await getCurrentSession().catch(() => null))) return NextResponse.json({ error: 'login' }, { status: 401 });
  const zip = new URL(req.url).searchParams.get('postnr') ?? '';
  if (!/^\d{4}$/.test(zip)) return NextResponse.json({ enabled: true, points: [] }, { headers });
  try {
    const points = (await pickupPoints(client, zip)).slice(0, 8);
    return NextResponse.json({ enabled: true, points }, { headers });
  } catch (e) {
    console.error('pakkeshop-fejl', e instanceof Error ? e.message.slice(0, 120) : 'ukendt');
    return NextResponse.json({ enabled: true, points: [], error: 'unavailable' }, { status: 502 });
  }
}
