import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { PgRateLimiter } from '@respin/auth';
import { isRequestOriginAllowed } from '@respin/security';
import { getCurrentSession } from '../../../../lib/auth';
import { getDb } from '../../../../lib/server';
import { getImageStore } from '../../../../lib/image-store';
import { MAX_UPLOAD_BYTES, UPLOAD_MESSAGES, processImage, type ProcessError } from '../../../../lib/image-pipeline';
import { sendImage } from '../../../../lib/conversations';
import { readCapped } from '../../../../lib/read-capped';

export const runtime = 'nodejs';
export const maxDuration = 30;

const NO_STORE = { 'Cache-Control': 'no-store, private' };
const fail = (status: number, error: keyof typeof UPLOAD_MESSAGES | 'not_found') =>
  NextResponse.json({ error: error === 'not_found' ? 'Samtalen findes ikke.' : UPLOAD_MESSAGES[error] }, { status, headers: NO_STORE });

/** Højst 30 billeder i timen pr. bruger i beskeder */
const LIMIT = { capacity: 30, refillPerSecond: 30 / 3600 };

/**
 * Send et billede i en samtale (rå bytes i body, Content-Type = billedtypen, ?samtale=<id>). Kræver login, samme
 * oprindelse og at man er part i samtalen. Billedet omkodes (EXIF/GPS og indlejret indhold fjernes) før det gemmes.
 */
export async function POST(req: Request) {
  const appOrigin = new URL(process.env.APP_URL ?? 'http://localhost:3000').origin;
  if (!isRequestOriginAllowed('POST', req.headers, [appOrigin])) return fail(403, 'forbidden');
  const current = await getCurrentSession();
  if (!current) return fail(401, 'unauthorized');
  if (Number(req.headers.get('content-length') ?? '0') > MAX_UPLOAD_BYTES) return fail(413, 'too_large');
  const conversationId = new URL(req.url).searchParams.get('samtale') ?? '';
  const db = getDb();
  if (!(await new PgRateLimiter(db, LIMIT).consume(`chat-image:${current.user.id}`)).allowed) return fail(429, 'rate_limited');

  const bytes = await readCapped(req.body, MAX_UPLOAD_BYTES);
  if (bytes === 'too_large') return fail(413, 'too_large');
  const r = await processImage(bytes, { declaredType: req.headers.get('content-type')?.split(';')[0]?.trim() || null });
  if (!r.ok) return fail(r.error === 'too_large' ? 413 : 400, r.error as ProcessError);

  const sent = await sendImage(db, getImageStore(), current.user.id, conversationId, r.image);
  if (!sent.ok) return fail(404, 'not_found');
  revalidatePath(`/konto/beskeder/${conversationId}/`);
  return NextResponse.json({ id: sent.id }, { status: 201, headers: NO_STORE });
}
