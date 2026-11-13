import { NextResponse } from 'next/server';
import { isRequestOriginAllowed } from '@respin/security';
import { getCurrentSession } from '../../../lib/auth';
import { getDb } from '../../../lib/server';
import { markNotesRead } from '../../../lib/live';

/** Marker alle notifikationer som læst (når klokken åbnes) */
export async function POST(req: Request) {
  const appOrigin = new URL(process.env.APP_URL ?? 'http://localhost:3000').origin;
  if (!isRequestOriginAllowed('POST', req.headers, [appOrigin])) return new NextResponse(null, { status: 403 });
  const current = await getCurrentSession();
  if (!current) return new NextResponse(null, { status: 401 });
  await markNotesRead(getDb(), current.user.id);
  return new NextResponse(null, { status: 204, headers: { 'Cache-Control': 'no-store, private' } });
}
