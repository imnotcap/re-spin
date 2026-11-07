'use server';

import { revalidatePath } from 'next/cache';
import { PgRateLimiter } from '@respin/auth';
import { requireSession } from './auth';
import { getDb } from './server';
import { updateProfile, type ProfileError } from './profile';

export type ProfileFormState = { error?: string; field?: string; saved?: boolean; username?: string } | undefined;

const MESSAGES: Record<ProfileError, [string, string]> = {
  invalid_username: ['username', 'Profilnavnet skal være 3–30 tegn: små bogstaver, tal, punktum, bindestreg eller understreg – og starte og slutte med et bogstav eller tal.'],
  reserved: ['username', 'Det profilnavn er reserveret. Vælg et andet.'],
  taken: ['username', 'Det profilnavn er taget. Vælg et andet.'],
  invalid_bio: ['bio', 'Teksten om dig må højst være 300 tegn.'],
  invalid_banner: ['banner', 'Vælg et af bannerne.']
};
/** Højst 20 ændringer i timen (navneskift skal ikke kunne bruges til at "låse" mange navne hurtigt) */
const LIMIT = { capacity: 20, refillPerSecond: 20 / 3600 };

export async function updateProfileAction(_: ProfileFormState, fd: FormData): Promise<ProfileFormState> {
  const current = await requireSession('/konto/');
  const db = getDb();
  if (!(await new PgRateLimiter(db, LIMIT).consume(`profile:${current.user.id}`)).allowed) return { error: 'Du har ændret profilen mange gange. Prøv igen om lidt.' };
  const str = (k: string) => { const v = fd.get(k); return typeof v === 'string' ? v : ''; };
  const r = await updateProfile(db, current.user.id, { username: str('username'), bio: str('bio'), banner: str('banner') });
  if (!r.ok) { const [field, error] = MESSAGES[r.error]; return { field, error }; }
  revalidatePath('/konto/');
  return { saved: true, username: r.username };
}
