import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

/**
 * Autentificeret kryptering (AES-256-GCM) af hemmeligheder vi selv skal kunne læse igen (fx TOTP-nøgler).
 * `aad` binder chifferteksten til fx bruger-id'et: en krypteret værdi kan ikke kopieres over på en anden bruger.
 * Nøglen kommer fra miljøet (32 byte, base64) og ligger aldrig i databasen.
 */
export function parseKey(base64: string): Buffer {
  const key = Buffer.from(base64, 'base64');
  if (key.length !== 32) throw new Error('Krypteringsnøglen skal være 32 byte (base64)');
  return key;
}

export function seal(key: Buffer, plaintext: string, aad: string): string {
  const iv = randomBytes(12);
  const c = createCipheriv('aes-256-gcm', key, iv);
  c.setAAD(Buffer.from(aad));
  const ct = Buffer.concat([c.update(plaintext, 'utf8'), c.final()]);
  return ['v1', iv.toString('base64url'), ct.toString('base64url'), c.getAuthTag().toString('base64url')].join('.');
}

export function open(key: Buffer, sealed: string, aad: string): string {
  const [v, iv, ct, tag] = sealed.split('.');
  if (v !== 'v1' || !iv || !ct || !tag) throw new Error('Ukendt format');
  const d = createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'base64url'));
  d.setAAD(Buffer.from(aad));
  d.setAuthTag(Buffer.from(tag, 'base64url'));
  return Buffer.concat([d.update(Buffer.from(ct, 'base64url')), d.final()]).toString('utf8'); // kaster ved manipulation
}
