import 'server-only';
import { randomInt } from 'node:crypto';
import { and, eq, sql } from 'drizzle-orm';
import { z } from 'zod';
import { schema, type Db } from '@respin/db';
import { normalizeUserText } from '@respin/core';
import { SELLERS } from './catalog';
import { isBannerId } from './banners';

const { users } = schema;

/** Samme regel som databasens CHECK: 3–30 tegn, a-z 0-9 . _ -, starter og slutter med bogstav/tal */
export const USERNAME = /^[a-z0-9][a-z0-9._-]{1,28}[a-z0-9]$/;

/** Navne, som ingen medlemmer må få (sidens egne ord og testversionens sælgere) */
const RESERVED = new Set(['admin', 'administrator', 'respin', 're-spin', 'support', 'hjaelp', 'help', 'konto', 'kontakt', 'system', 'moderator', 'staff', 'api', 'www', ...SELLERS.map((s) => s.name)]);
export const isReservedUsername = (u: string) => RESERVED.has(u) || /^(re[._-]?spin)/.test(u);

/** "Mette Ørsted" → "mette.oersted" */
export function slugifyUsername(name: string): string {
  const s = name.toLowerCase().replace(/æ/g, 'ae').replace(/ø/g, 'oe').replace(/å/g, 'aa')
    .normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '.').replace(/^[._-]+|[._-]+$/g, '').slice(0, 24).replace(/[._-]+$/g, '');
  return s.length >= 3 ? s : `medlem${s ? '.' + s : ''}`;
}

/**
 * Giv brugeren et profilnavn, hvis det mangler (første gang profilen skal bruges). Forslaget bygger på
 * visningsnavnet; er det taget eller reserveret, sættes et tal på. Returnerer det endelige navn.
 */
export async function ensureUsername(db: Db, userId: string): Promise<string> {
  const [u] = await db.select({ username: users.username, displayName: users.displayName }).from(users).where(eq(users.id, userId));
  if (!u) throw new Error('Ukendt bruger');
  if (u.username) return u.username;
  const base = slugifyUsername(u.displayName);
  for (let i = 0; i < 20; i++) {
    const candidate = i === 0 ? base : `${base.slice(0, 24)}.${randomInt(100, 10_000)}`;
    if (!USERNAME.test(candidate) || isReservedUsername(candidate)) continue;
    // Kun hvis brugeren stadig ikke har et navn (to samtidige kald må ikke overskrive hinanden)
    const r = await db.update(users).set({ username: candidate }).where(and(eq(users.id, userId), sql`${users.username} IS NULL`))
      .returning({ username: users.username }).catch((e: unknown) => { if (isUniqueViolation(e)) return []; throw e; });
    if (r.length) return r[0]!.username!;
    const [again] = await db.select({ username: users.username }).from(users).where(eq(users.id, userId));
    if (again?.username) return again.username;
  }
  throw new Error('Kunne ikke finde et ledigt profilnavn');
}

function isUniqueViolation(e: unknown): boolean {
  const err = e as { code?: string; cause?: { code?: string } };
  return err?.code === '23505' || err?.cause?.code === '23505';
}

export const profileInput = z.object({
  username: z.string().trim().toLowerCase().max(60).pipe(z.string().regex(USERNAME)),
  bio: z.string().max(1200).transform(normalizeUserText).pipe(z.string().max(300)),
  banner: z.string().refine(isBannerId)
}).strict();

export type ProfileError = 'invalid_username' | 'reserved' | 'taken' | 'invalid_bio' | 'invalid_banner';

/** Gem profil (navn, bio, banner) for den indloggede. Brugerens eget id kommer fra sessionen – aldrig fra formularen. */
export async function updateProfile(db: Db, userId: string, raw: unknown): Promise<{ ok: true; username: string } | { ok: false; error: ProfileError }> {
  const p = profileInput.safeParse(raw);
  if (!p.success) {
    const f = String(p.error.issues[0]?.path[0] ?? '');
    return { ok: false, error: f === 'bio' ? 'invalid_bio' : f === 'banner' ? 'invalid_banner' : 'invalid_username' };
  }
  const v = p.data;
  if (isReservedUsername(v.username)) return { ok: false, error: 'reserved' };
  try {
    await db.update(users).set({ username: v.username, bio: v.bio || null, profileBanner: v.banner }).where(eq(users.id, userId));
  } catch (e) {
    if (isUniqueViolation(e)) return { ok: false, error: 'taken' };
    throw e;
  }
  return { ok: true, username: v.username };
}

/** Offentlig profil for et medlem (kun aktive brugere) */
export async function memberByUsername(db: Db, username: string) {
  const u = username.toLowerCase();
  if (!USERNAME.test(u)) return null;
  const [m] = await db.select({ id: users.id, username: users.username, displayName: users.displayName, bio: users.bio, banner: users.profileBanner, createdAt: users.createdAt })
    .from(users).where(and(eq(users.username, u), eq(users.status, 'active')));
  return m ?? null;
}

export async function profileFor(db: Db, userId: string) {
  const [m] = await db.select({ username: users.username, bio: users.bio, banner: users.profileBanner, displayName: users.displayName }).from(users).where(eq(users.id, userId));
  return m ?? null;
}
