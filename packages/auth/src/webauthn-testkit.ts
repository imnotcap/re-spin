/**
 * Software-autentikator KUN til tests: laver gyldige (og bevidst ugyldige) WebAuthn-svar uden en fysisk enhed.
 * Følger WebAuthn Level 2: authenticatorData = rpIdHash | flags | signCount | [attestedCredentialData].
 */
import { createHash, generateKeyPairSync, randomBytes, sign, type KeyObject } from 'node:crypto';

const b64u = (b: Uint8Array) => Buffer.from(b).toString('base64url');
const sha256 = (b: Uint8Array | string) => createHash('sha256').update(b).digest();

/** Minimal CBOR-encoder (det WebAuthn bruger: heltal, bytes, tekst, maps) */
function head(major: number, n: number): Buffer {
  if (n < 24) return Buffer.from([(major << 5) | n]);
  if (n < 256) return Buffer.from([(major << 5) | 24, n]);
  if (n < 65536) { const b = Buffer.alloc(3); b[0] = (major << 5) | 25; b.writeUInt16BE(n, 1); return b; }
  const b = Buffer.alloc(5); b[0] = (major << 5) | 26; b.writeUInt32BE(n, 1); return b;
}
type Cbor = number | string | Uint8Array | Map<number | string, Cbor> | { [k: string]: Cbor };
export function cbor(v: Cbor): Buffer {
  if (typeof v === 'number') return v >= 0 ? head(0, v) : head(1, -1 - v);
  if (typeof v === 'string') { const s = Buffer.from(v); return Buffer.concat([head(3, s.length), s]); }
  if (v instanceof Uint8Array) return Buffer.concat([head(2, v.length), Buffer.from(v)]);
  const entries = v instanceof Map ? [...v.entries()] : Object.entries(v);
  return Buffer.concat([head(5, entries.length), ...entries.flatMap(([k, val]) => [cbor(k as Cbor), cbor(val)])]);
}

export class SoftAuthenticator {
  readonly credentialId = randomBytes(32);
  private readonly privateKey: KeyObject;
  private readonly cose: Buffer;
  counter = 0;
  constructor(private origin: string, private rpId: string) {
    const { privateKey, publicKey } = generateKeyPairSync('ec', { namedCurve: 'P-256' });
    this.privateKey = privateKey;
    const jwk = publicKey.export({ format: 'jwk' });
    this.cose = cbor(new Map<number, Cbor>([[1, 2], [3, -7], [-1, 1], [-2, Buffer.from(jwk.x!, 'base64url')], [-3, Buffer.from(jwk.y!, 'base64url')]]));
  }
  get id() { return b64u(this.credentialId); }

  private authData(rpId: string, flags: number, withCredential: boolean) {
    const count = Buffer.alloc(4); count.writeUInt32BE(this.counter);
    const parts: Uint8Array[] = [sha256(rpId), Buffer.from([flags]), count];
    if (withCredential) { const len = Buffer.alloc(2); len.writeUInt16BE(this.credentialId.length); parts.push(Buffer.alloc(16), len, this.credentialId, this.cose); }
    return Buffer.concat(parts);
  }

  register(options: { challenge: string }, o: { origin?: string; rpId?: string; uv?: boolean } = {}) {
    const clientDataJSON = Buffer.from(JSON.stringify({ type: 'webauthn.create', challenge: options.challenge, origin: o.origin ?? this.origin, crossOrigin: false }));
    const flags = 0x01 | (o.uv === false ? 0 : 0x04) | 0x40 | 0x08 | 0x10; // UP | UV | AT | BE | BS
    const attestationObject = cbor({ fmt: 'none', attStmt: {}, authData: this.authData(o.rpId ?? this.rpId, flags, true) });
    return { id: this.id, rawId: this.id, type: 'public-key' as const, clientExtensionResults: {}, authenticatorAttachment: 'platform' as const,
      response: { clientDataJSON: b64u(clientDataJSON), attestationObject: b64u(attestationObject), transports: ['internal' as const] } };
  }

  login(options: { challenge: string }, userId: string, o: { origin?: string; rpId?: string; uv?: boolean; counter?: number; signWith?: SoftAuthenticator } = {}) {
    this.counter = o.counter ?? this.counter + 1;
    const clientDataJSON = Buffer.from(JSON.stringify({ type: 'webauthn.get', challenge: options.challenge, origin: o.origin ?? this.origin, crossOrigin: false }));
    const authenticatorData = this.authData(o.rpId ?? this.rpId, 0x01 | (o.uv === false ? 0 : 0x04) | 0x08 | 0x10, false);
    const signer = (o.signWith ?? this).privateKey;
    const signature = sign('sha256', Buffer.concat([authenticatorData, sha256(clientDataJSON)]), signer);
    return { id: this.id, rawId: this.id, type: 'public-key' as const, clientExtensionResults: {}, authenticatorAttachment: 'platform' as const,
      response: { clientDataJSON: b64u(clientDataJSON), authenticatorData: b64u(authenticatorData), signature: b64u(signature), userHandle: b64u(new TextEncoder().encode(userId)) } };
  }
}
