import { createHmac, timingSafeEqual } from 'node:crypto';

/** TOTP (RFC 6238) oven på HOTP (RFC 4226). Kompatibel med Google Authenticator, 1Password, Microsoft Authenticator m.fl. */
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export function base32Encode(buf: Uint8Array): string {
  let bits = 0, value = 0, out = '';
  for (const byte of buf) {
    value = (value << 8) | byte; bits += 8;
    while (bits >= 5) { out += ALPHABET[(value >>> (bits - 5)) & 31]; bits -= 5; }
  }
  if (bits > 0) out += ALPHABET[(value << (5 - bits)) & 31];
  return out;
}

export function base32Decode(input: string): Buffer {
  const clean = input.toUpperCase().replace(/[\s=-]/g, '');
  let bits = 0, value = 0; const out: number[] = [];
  for (const ch of clean) {
    const i = ALPHABET.indexOf(ch);
    if (i === -1) throw new Error('Ugyldig base32');
    value = (value << 5) | i; bits += 5;
    if (bits >= 8) { out.push((value >>> (bits - 8)) & 255); bits -= 8; }
  }
  return Buffer.from(out);
}

export function hotp(secret: Buffer, counter: number, digits = 6): string {
  const msg = Buffer.alloc(8);
  msg.writeBigUInt64BE(BigInt(counter));
  const h = createHmac('sha1', secret).update(msg).digest();
  const offset = h[h.length - 1]! & 0x0f;
  const bin = ((h[offset]! & 0x7f) << 24) | (h[offset + 1]! << 16) | (h[offset + 2]! << 8) | h[offset + 3]!;
  return String(bin % 10 ** digits).padStart(digits, '0');
}

export const TOTP_STEP_SECONDS = 30;
export const stepAt = (timeMs: number) => Math.floor(timeMs / 1000 / TOTP_STEP_SECONDS);
export const totpAt = (secret: Buffer, timeMs: number, digits = 6) => hotp(secret, stepAt(timeMs), digits);

/**
 * Tjek en kode med ±1 tidstrin (ur-forskel). Koder fra et tidstrin, der allerede er brugt, afvises (genafspilning).
 * Returnerer tidstrinnet, så kalderen kan gemme det som "sidst brugt".
 */
export function verifyTotp(secret: Buffer, code: string, timeMs: number, lastUsedStep: number): { ok: true; step: number } | { ok: false } {
  if (!/^\d{6}$/.test(code)) return { ok: false };
  const now = stepAt(timeMs);
  for (const step of [now - 1, now, now + 1]) {
    if (step <= lastUsedStep) continue;
    if (timingSafeEqual(Buffer.from(hotp(secret, step)), Buffer.from(code))) return { ok: true, step };
  }
  return { ok: false };
}

export function otpauthUri(secretBase32: string, account: string, issuer = 'Videro'): string {
  const label = encodeURIComponent(`${issuer}:${account}`);
  return `otpauth://totp/${label}?secret=${secretBase32}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=${TOTP_STEP_SECONDS}`;
}
