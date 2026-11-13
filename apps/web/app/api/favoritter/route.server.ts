import { NextResponse } from 'next/server';
import { isRequestOriginAllowed } from '@respin/security';
import { getCurrentSession } from '../../../lib/auth';
import { getDb } from '../../../lib/server';
import { setFavorite, syncFavorites } from '../../../lib/favorites-server';
import { checkFavorite } from '../../../lib/spam';

const NO_STORE = { 'Cache-Control': 'no-store, private' };

/**
 * Gem/fjern en favorit ({ listingId, on }) eller gem browserens liste efter login ({ sync: [id, …] }).
 * Kræver login og samme oprindelse; højst 120 ændringer i timen pr. bruger (mod bots, der "liker" alt).
 */
export async function POST(req: Request) {
  const appOrigin = new URL(process.env.APP_URL ?? 'http://localhost:3000').origin;
  if (!isRequestOriginAllowed('POST', req.headers, [appOrigin])) return NextResponse.json({ ok: false }, { status: 403, headers: NO_STORE });
  const current = await getCurrentSession();
  if (!current) return NextResponse.json({ ok: false }, { status: 401, headers: NO_STORE });
  const body = (await req.json().catch(() => null)) as { listingId?: unknown; on?: unknown; sync?: unknown } | null;
  const db = getDb();
  if (!(await checkFavorite(db, current.user.id))) return NextResponse.json({ ok: false }, { status: 429, headers: NO_STORE });
  if (Array.isArray(body?.sync)) {
    await syncFavorites(db, current.user.id, body.sync.filter((x): x is string => typeof x === 'string').slice(0, 500));
    return NextResponse.json({ ok: true }, { headers: NO_STORE });
  }
  if (typeof body?.listingId !== 'string' || typeof body.on !== 'boolean') return NextResponse.json({ ok: false }, { status: 400, headers: NO_STORE });
  const ok = await setFavorite(db, current.user.id, body.listingId, body.on);
  return NextResponse.json({ ok }, { status: ok ? 200 : 400, headers: NO_STORE });
}
