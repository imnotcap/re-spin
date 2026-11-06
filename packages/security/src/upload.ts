/**
 * Validering af billed-uploads. Stoler ALDRIG på filnavn, Content-Type eller filendelse fra klienten.
 * Dette er første forsvarslinje; den egentlige sikkerhed er at billedet omkodes server-side (EXIF/GPS og
 * ikke-billeddata fjernes, pixelloft med `limitInputPixels`), scannes, og serves fra et separat domæne/bucket
 * med `X-Content-Type-Options: nosniff`. SVG og GIF tillades ikke (SVG kan indeholde scripts).
 */
export type ImageType = 'image/jpeg' | 'image/png' | 'image/webp';
export const MAX_IMAGE_BYTES = 15 * 1024 * 1024;
const EXT: Record<ImageType, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };

const startsWith = (b: Uint8Array, sig: number[], offset = 0) => sig.every((v, i) => b[offset + i] === v);

/** Genkend billedtype ud fra de første bytes ("magic bytes") */
export function sniffImageType(b: Uint8Array): ImageType | null {
  if (b.length < 12) return null;
  if (startsWith(b, [0xff, 0xd8, 0xff])) return 'image/jpeg';
  if (startsWith(b, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return 'image/png';
  if (startsWith(b, [0x52, 0x49, 0x46, 0x46]) && startsWith(b, [0x57, 0x45, 0x42, 0x50], 8)) return 'image/webp'; // RIFF....WEBP
  return null;
}

export type UploadCheck =
  | { ok: true; type: ImageType; extension: string }
  | { ok: false; reason: 'empty' | 'too_large' | 'unsupported_type' | 'type_mismatch' };

export function validateImageUpload(input: { bytes: Uint8Array; declaredType?: string | null; maxBytes?: number }): UploadCheck {
  const max = input.maxBytes ?? MAX_IMAGE_BYTES;
  if (input.bytes.length === 0) return { ok: false, reason: 'empty' };
  if (input.bytes.length > max) return { ok: false, reason: 'too_large' };
  const type = sniffImageType(input.bytes);
  if (!type) return { ok: false, reason: 'unsupported_type' };
  if (input.declaredType && input.declaredType.toLowerCase() !== type) return { ok: false, reason: 'type_mismatch' };
  return { ok: true, type, extension: EXT[type] };
}

/** Server-genereret lagernøgle. Indeholder aldrig brugerinput (forhindrer path traversal og overskrivning). */
export function newImageStorageKey(type: ImageType, now = new Date()): { id: string; key: string } {
  const id = globalThis.crypto.randomUUID();
  const yyyy = now.getUTCFullYear();
  const mm = String(now.getUTCMonth() + 1).padStart(2, '0');
  return { id, key: `listings/${yyyy}/${mm}/${id}.${EXT[type]}` };
}
