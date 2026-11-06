/**
 * IP-håndtering: parsing, CIDR-allowlist og udledning af klient-IP.
 *
 * VIGTIGT: Klientens IP må kun læses fra en header, som den foranstående proxy (Cloudflare/Vercel) SELV sætter.
 * `X-Forwarded-For` kan forfalskes af klienten – derfor tælles der fra HØJRE med et kendt antal betroede proxyer.
 * IP-allowlist er ét lag i forsvaret; den erstatter aldrig login + MFA.
 */
export interface ParsedIp { version: 4 | 6; value: bigint }
export interface ParsedCidr { version: 4 | 6; base: bigint; prefix: number }

function parseV4(s: string): bigint | null {
  const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(s);
  if (!m) return null;
  let v = 0n;
  for (let i = 1; i <= 4; i++) {
    const part = m[i]!;
    if (part.length > 1 && part.startsWith('0')) return null; // ingen ledende nuller (tvetydig oktal-tolkning)
    const n = Number(part);
    if (n > 255) return null;
    v = (v << 8n) | BigInt(n);
  }
  return v;
}

function parseV6(input: string): bigint | null {
  let s = input.toLowerCase();
  const zone = s.indexOf('%');
  if (zone !== -1) s = s.slice(0, zone);
  let tail: bigint[] = [];
  const lastColon = s.lastIndexOf(':');
  const maybeV4 = s.slice(lastColon + 1);
  if (maybeV4.includes('.')) {
    const v4 = parseV4(maybeV4);
    if (v4 === null) return null;
    tail = [(v4 >> 16n) & 0xffffn, v4 & 0xffffn];
    s = s.slice(0, lastColon + 1) + '0:0';
  }
  const halves = s.split('::');
  if (halves.length > 2) return null;
  const toGroups = (part: string): number[] | null => {
    if (part === '') return [];
    const groups = part.split(':');
    if (groups.some((g) => !/^[0-9a-f]{1,4}$/.test(g))) return null;
    return groups.map((g) => parseInt(g, 16));
  };
  const head = toGroups(halves[0]!);
  const rest = halves.length === 2 ? toGroups(halves[1]!) : [];
  if (!head || !rest) return null;
  const missing = 8 - head.length - rest.length;
  if (halves.length === 1 ? head.length !== 8 : missing < 1) return null;
  const groups = [...head, ...Array(halves.length === 2 ? missing : 0).fill(0), ...rest].map(BigInt);
  if (tail.length) { groups[6] = tail[0]!; groups[7] = tail[1]!; }
  if (groups.length !== 8) return null;
  return groups.reduce((acc, g) => (acc << 16n) | g, 0n);
}

export function parseIp(raw: string): ParsedIp | null {
  const s = raw.trim();
  if (s.includes(':')) {
    const v = parseV6(s);
    if (v === null) return null;
    // IPv4-mappet IPv6 (::ffff:1.2.3.4) behandles som IPv4, så en allowlist ikke kan omgås med den skrivemåde
    if (v >> 32n === 0xffffn) return { version: 4, value: v & 0xffffffffn };
    return { version: 6, value: v };
  }
  const v4 = parseV4(s);
  return v4 === null ? null : { version: 4, value: v4 };
}

export function parseCidr(raw: string): ParsedCidr | null {
  const [addr, len, extra] = raw.trim().split('/');
  if (extra !== undefined || !addr) return null;
  const ip = parseIp(addr);
  if (!ip) return null;
  const max = ip.version === 4 ? 32 : 128;
  const prefix = len === undefined ? max : /^\d{1,3}$/.test(len) ? Number(len) : NaN;
  if (!Number.isInteger(prefix) || prefix < 0 || prefix > max) return null;
  // IPv4-mappede CIDR'er (::ffff:a.b.c.d/96+n) normaliseres ikke – skriv IPv4-CIDR direkte
  const shift = BigInt(max - prefix);
  return { version: ip.version, base: (ip.value >> shift) << shift, prefix };
}

/**
 * Er IP'en i en af CIDR-listerne? Fejler LUKKET: manglende/ugyldig IP eller tom liste → false.
 * Ugyldige CIDR-linjer ignoreres ikke i stilhed – de kaster, så en slåfejl opdages ved opstart.
 */
export function isIpAllowed(ip: string | null | undefined, cidrs: readonly string[]): boolean {
  if (!ip) return false;
  const parsed = parseIp(ip);
  if (!parsed) return false;
  const ranges = cidrs.map((c) => {
    const r = parseCidr(c);
    if (!r) throw new Error(`Ugyldig CIDR i allowlist: ${JSON.stringify(c)}`);
    return r;
  });
  const max = parsed.version === 4 ? 32 : 128;
  return ranges.some((r) => r.version === parsed.version && (parsed.value >> BigInt(max - r.prefix)) << BigInt(max - r.prefix) === r.base);
}

export interface ClientIpOptions {
  /** Hvilken header sætter din betroede proxy? Cloudflare: 'cf-connecting-ip'. Vercel: 'x-real-ip' eller 'x-forwarded-for'. */
  header: 'cf-connecting-ip' | 'x-real-ip' | 'x-forwarded-for';
  /** Kun for x-forwarded-for: antal betroede proxyer foran appen (default 1). Tælles fra højre. */
  trustedProxies?: number;
}

export function getClientIp(headers: Headers, o: ClientIpOptions): string | null {
  const value = headers.get(o.header);
  if (!value) return null;
  let candidate: string | undefined;
  if (o.header === 'x-forwarded-for') {
    const parts = value.split(',').map((p) => p.trim()).filter(Boolean);
    const n = o.trustedProxies ?? 1;
    candidate = parts[parts.length - n];
  } else {
    candidate = value.trim();
  }
  return candidate && parseIp(candidate) ? candidate : null;
}
