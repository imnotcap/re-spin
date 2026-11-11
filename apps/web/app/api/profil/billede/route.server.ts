import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { PgRateLimiter } from '@respin/auth';
import { isRequestOriginAllowed } from '@respin/security';
import { getCurrentSession } from '../../../../lib/auth';
import { getDb } from '../../../../lib/server';
import { getImageStore, newProfileImageKey } from '../../../../lib/image-store';
import { MAX_UPLOAD_BYTES, UPLOAD_MESSAGES, isProfileImageKind, processProfileImage, type ProcessError } from '../../../../lib/image-pipeline';
import { removeProfileImage, setProfileImage } from '../../../../lib/profile';
import { readCapped } from '../../../../lib/read-capped';

export const runtime = 'nodejs';
export const maxDuration = 30;

const NO_STORE = { 'Cache-Control': 'no-store, private' };
const fail = (status: number, error: keyof typeof UPLOAD_MESSAGES | 'bad_kind') =>
  NextResponse.json({ error: error === 'bad_kind' ? 'Ukendt billedtype.' : UPLOAD_MESSAGES[error] }, { status, headers: NO_STORE });

/** Højst 20 profilbilleder/bannere i timen pr. bruger */
const LIMIT = { capacity: 20, refillPerSecond: 20 / 3600 };

/** Fælles for POST og DELETE: samme oprindelse, logget ind, gyldig type (?type=avatar|banner) og inden for loftet */
async function guard(req: Request) {
  const appOrigin = new URL(process.env.APP_URL ?? 'http://localhost:3000').origin;
  if (!isRequestOriginAllowed(req.method, req.headers, [appOrigin])) return { res: fail(403, 'forbidden') };
  const current = await getCurrentSession();
  if (!current) return { res: fail(401, 'unauthorized') };
  const kind = new URL(req.url).searchParams.get('type');
  if (!isProfileImageKind(kind)) return { res: fail(400, 'bad_kind') };
  const db = getDb();
  if (!(await new PgRateLimiter(db, LIMIT).consume(`profile-image:${current.user.id}`)).allowed) return { res: fail(429, 'rate_limited') };
  return { db, userId: current.user.id, kind };
}

/**
 * Upload af profilbillede eller eget banner (rå bytes i body, Content-Type = billedtypen).
 * Billedet omkodes og beskæres på serveren, gemmes med det samme og erstatter det gamle.
 */
export async function POST(req: Request) {
  const g = await guard(req);
  if ('res' in g) return g.res;
  if (Number(req.headers.get('content-length') ?? '0') > MAX_UPLOAD_BYTES) return fail(413, 'too_large');
  const bytes = await readCapped(req.body, MAX_UPLOAD_BYTES);
  if (bytes === 'too_large') return fail(413, 'too_large');
  const r = await processProfileImage(bytes, g.kind, { declaredType: req.headers.get('content-type')?.split(';')[0]?.trim() || null });
  if (!r.ok) return fail(r.error === 'too_large' ? 413 : 400, r.error as ProcessError);

  const store = getImageStore();
  const key = newProfileImageKey(crypto.randomUUID());
  await store.put(key, r.image, 'image/webp');
  await setProfileImage(g.db, store, g.userId, g.kind, key);
  revalidatePath('/konto/');
  return NextResponse.json({ url: store.urlFor(key) }, { status: 201, headers: NO_STORE });
}

/** Fjern profilbilledet eller det egne banner */
export async function DELETE(req: Request) {
  const g = await guard(req);
  if ('res' in g) return g.res;
  await removeProfileImage(g.db, getImageStore(), g.userId, g.kind);
  revalidatePath('/konto/');
  return new NextResponse(null, { status: 204, headers: NO_STORE });
}
