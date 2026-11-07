import { NextResponse } from 'next/server';
import { PgRateLimiter } from '@respin/auth';
import { isRequestOriginAllowed } from '@respin/security';
import { getCurrentSession } from '../../../lib/auth';
import { getDb } from '../../../lib/server';
import { getImageStore, newImageKey } from '../../../lib/image-store';
import { MAX_UPLOAD_BYTES, UPLOAD_MESSAGES, processImage, type ProcessError } from '../../../lib/image-pipeline';
import { MAX_PENDING_IMAGES, pendingImageCount, saveProcessedImage } from '../../../lib/listings';

export const runtime = 'nodejs';
export const maxDuration = 30;

const NO_STORE = { 'Cache-Control': 'no-store, private' };
const fail = (status: number, error: keyof typeof UPLOAD_MESSAGES) => NextResponse.json({ error: UPLOAD_MESSAGES[error] }, { status, headers: NO_STORE });

/** Højst 60 billeder i timen pr. bruger */
const UPLOAD_LIMIT = { capacity: 60, refillPerSecond: 60 / 3600 };

/** Læs body med et loft – stopper ved loftet i stedet for at læse alt ind først */
async function readCapped(body: ReadableStream<Uint8Array> | null, max: number): Promise<Uint8Array | 'too_large'> {
  if (!body) return new Uint8Array(0);
  const reader = body.getReader(); const parts: Uint8Array[] = []; let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > max) { await reader.cancel(); return 'too_large'; }
    parts.push(value);
  }
  const out = new Uint8Array(size); let o = 0;
  for (const p of parts) { out.set(p, o); o += p.length; }
  return out;
}

/**
 * Upload af ét annoncefoto (rå bytes i body, Content-Type = billedtypen). Kræver login og samme oprindelse.
 * Svarer med billedets id, som annonceformularen sender med, når annoncen oprettes.
 */
export async function POST(req: Request) {
  const appOrigin = new URL(process.env.APP_URL ?? 'http://localhost:3000').origin;
  if (!isRequestOriginAllowed('POST', req.headers, [appOrigin])) return fail(403, 'forbidden');
  const current = await getCurrentSession();
  if (!current) return fail(401, 'unauthorized');
  const declared = Number(req.headers.get('content-length') ?? '0');
  if (declared > MAX_UPLOAD_BYTES) return fail(413, 'too_large');

  const db = getDb();
  if (!(await new PgRateLimiter(db, UPLOAD_LIMIT).consume(`upload:${current.user.id}`)).allowed) return fail(429, 'rate_limited');
  if ((await pendingImageCount(db, current.user.id)) >= MAX_PENDING_IMAGES) return fail(429, 'too_many_pending');

  const bytes = await readCapped(req.body, MAX_UPLOAD_BYTES);
  if (bytes === 'too_large') return fail(413, 'too_large');
  const r = await processImage(bytes, { declaredType: req.headers.get('content-type')?.split(';')[0]?.trim() || null });
  if (!r.ok) return fail(r.error === 'too_large' ? 413 : 400, r.error as ProcessError);

  const id = crypto.randomUUID();
  const saved = await saveProcessedImage(db, getImageStore(), current.user.id, { id, key: newImageKey(id), ...r.image });
  return NextResponse.json(saved, { status: 201, headers: NO_STORE });
}
