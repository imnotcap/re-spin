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

/**
 * Upload-pipeline: magic bytes → afkodning med pixelloft → roteret efter EXIF → omkodet til WebP.
 * Omkodningen er selve sikkerheden: kun pixels overlever. EXIF (inkl. GPS-position), ICC-kommentarer,
 * indlejrede data og evt. polyglot-indhold (fx HTML/JS gemt i filen) forsvinder, fordi sharp ikke
 * skriver metadata, medmindre man beder om det.
 */
export async function processImage(bytes: Uint8Array, opts: { declaredType?: string | null; maxPixels?: number } = {}): Promise<{ ok: true; image: ProcessedImage } | { ok: false; error: ProcessError }> {
  const check = validateImageUpload({ bytes, declaredType: opts.declaredType, maxBytes: MAX_UPLOAD_BYTES });
  if (!check.ok) return { ok: false, error: check.reason };
  const maxPixels = opts.maxPixels ?? MAX_INPUT_PIXELS;
  const input = { limitInputPixels: maxPixels, failOn: 'error' as const, animated: false };
  try {
    const meta = await sharp(bytes, input).metadata();
    if (!meta.width || !meta.height) return { ok: false, error: 'unreadable' };
    if (meta.width * meta.height > maxPixels) return { ok: false, error: 'too_many_pixels' };
    if (Math.min(meta.width, meta.height) < 200) return { ok: false, error: 'too_small' };
    const base = () => sharp(bytes, input).rotate();
    const { data: main, info } = await base().resize({ width: MAIN_PX, height: MAIN_PX, fit: 'inside', withoutEnlargement: true }).webp({ quality: 80 }).toBuffer({ resolveWithObject: true });
    const thumb = await base().resize({ width: THUMB_PX, height: THUMB_PX, fit: 'inside', withoutEnlargement: true }).webp({ quality: 75 }).toBuffer();
    return { ok: true, image: { main, thumb, width: info.width, height: info.height } };
  } catch (e) {
    const msg = e instanceof Error ? e.message : '';
    return { ok: false, error: /pixel limit/i.test(msg) ? 'too_many_pixels' : 'unreadable' };
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
