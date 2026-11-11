import 'server-only';
import sharp from 'sharp';
import { validateImageUpload } from '@respin/security';

/** Største billede vi tager imod (Vercel afviser selv request-bodies over 4,5 MB) */
export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;
/** Pixelloft mod "dekompressionsbomber": en lille fil, der fylder gigabytes i hukommelsen */
export const MAX_INPUT_PIXELS = 40_000_000;
export const MAIN_PX = 1600;
export const THUMB_PX = 480;

export type ProcessError = 'empty' | 'too_large' | 'unsupported_type' | 'type_mismatch' | 'unreadable' | 'too_many_pixels' | 'too_small';
export interface ProcessedImage { main: Buffer; thumb: Buffer; width: number; height: number }

type Opts = { declaredType?: string | null; maxPixels?: number };
type SharpInput = { limitInputPixels: number; failOn: 'error'; animated: false };

/** Fælles tjek før omkodning: type (magic bytes), pixelloft og mindstestørrelse */
async function inspect(bytes: Uint8Array, opts: Opts): Promise<{ ok: true; input: SharpInput } | { ok: false; error: ProcessError }> {
  const check = validateImageUpload({ bytes, declaredType: opts.declaredType, maxBytes: MAX_UPLOAD_BYTES });
  if (!check.ok) return { ok: false, error: check.reason };
  const maxPixels = opts.maxPixels ?? MAX_INPUT_PIXELS;
  const input: SharpInput = { limitInputPixels: maxPixels, failOn: 'error', animated: false };
  const meta = await sharp(bytes, input).metadata();
  if (!meta.width || !meta.height) return { ok: false, error: 'unreadable' };
  if (meta.width * meta.height > maxPixels) return { ok: false, error: 'too_many_pixels' };
  if (Math.min(meta.width, meta.height) < 200) return { ok: false, error: 'too_small' };
  return { ok: true, input };
}

const decodeError = (e: unknown): { ok: false; error: ProcessError } =>
  ({ ok: false, error: /pixel limit/i.test(e instanceof Error ? e.message : '') ? 'too_many_pixels' : 'unreadable' });

/**
 * Upload-pipeline: magic bytes → afkodning med pixelloft → roteret efter EXIF → omkodet til WebP.
 * Omkodningen er selve sikkerheden: kun pixels overlever. EXIF (inkl. GPS-position), ICC-kommentarer,
 * indlejrede data og evt. polyglot-indhold (fx HTML/JS gemt i filen) forsvinder, fordi sharp ikke
 * skriver metadata, medmindre man beder om det.
 */
export async function processImage(bytes: Uint8Array, opts: Opts = {}): Promise<{ ok: true; image: ProcessedImage } | { ok: false; error: ProcessError }> {
  try {
    const c = await inspect(bytes, opts);
    if (!c.ok) return c;
    const base = () => sharp(bytes, c.input).rotate();
    const { data: main, info } = await base().resize({ width: MAIN_PX, height: MAIN_PX, fit: 'inside', withoutEnlargement: true }).webp({ quality: 80 }).toBuffer({ resolveWithObject: true });
    const thumb = await base().resize({ width: THUMB_PX, height: THUMB_PX, fit: 'inside', withoutEnlargement: true }).webp({ quality: 75 }).toBuffer();
    return { ok: true, image: { main, thumb, width: info.width, height: info.height } };
  } catch (e) {
    return decodeError(e);
  }
}

/** Profilbillede: kvadratisk 512 px. Banner: 1600 × 400 (samme format som de faste bannere). */
export const PROFILE_IMAGE_SIZE = { avatar: { width: 512, height: 512 }, banner: { width: 1600, height: 400 } } as const;
export type ProfileImageKind = keyof typeof PROFILE_IMAGE_SIZE;
export const isProfileImageKind = (v: unknown): v is ProfileImageKind => v === 'avatar' || v === 'banner';

/**
 * Samme pipeline som annoncefotos (magic bytes, pixelloft, EXIF-rotation, omkodning til WebP uden metadata),
 * men beskåret til profilbilledets eller bannerets faste format. Beskæringen tager det mest "interessante"
 * udsnit (sharp: attention), så et ansigt eller en vare ikke skæres væk.
 */
export async function processProfileImage(bytes: Uint8Array, kind: ProfileImageKind, opts: Opts = {}): Promise<{ ok: true; image: Buffer } | { ok: false; error: ProcessError }> {
  try {
    const c = await inspect(bytes, opts);
    if (!c.ok) return c;
    const { width, height } = PROFILE_IMAGE_SIZE[kind];
    const image = await sharp(bytes, c.input).rotate().resize({ width, height, fit: 'cover', position: sharp.strategy.attention }).webp({ quality: 80 }).toBuffer();
    return { ok: true, image };
  } catch (e) {
    return decodeError(e);
  }
}

export const UPLOAD_MESSAGES: Record<ProcessError | 'rate_limited' | 'too_many_pending' | 'unauthorized' | 'forbidden', string> = {
  empty: 'Filen er tom.',
  too_large: 'Billedet er for stort (højst 4 MB).',
  unsupported_type: 'Kun JPEG, PNG og WebP.',
  type_mismatch: 'Filtypen passer ikke til indholdet.',
  unreadable: 'Billedet kunne ikke læses.',
  too_many_pixels: 'Billedet har for mange pixels.',
  too_small: 'Billedet er for lille (mindst 200 × 200 px).',
  rate_limited: 'Du har uploadet mange billeder. Vent lidt, og prøv igen.',
  too_many_pending: 'Du har mange billeder, der ikke er brugt i en annonce. Opret annoncen først.',
  unauthorized: 'Log ind for at uploade billeder.',
  forbidden: 'Afvist.'
};
