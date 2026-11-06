/**
 * Sikkerheds-headers og Content Security Policy.
 *
 * CSP: scripts kun med per-request nonce (+ 'strict-dynamic'); ingen 'unsafe-inline' for scripts.
 * `style-src-attr 'unsafe-inline'` er et bevidst kompromis: UI-kittet bruger style-attributter (fx CSS-variabler).
 * Style-attributter kan ikke eksekvere kode; risikoen er begrænset til visuel manipulation.
 */
export interface CspOptions {
  nonce: string;
  isDev?: boolean;
  /** Ekstra kilder, fx billed-CDN: ['https://cdn.respin.dk'] */
  imgSrc?: string[];
  connectSrc?: string[];
  frameSrc?: string[];
  styleSrc?: string[];
  fontSrc?: string[];
  /** Report-only-endpoint (CSP-brud logges) */
  reportUri?: string;
}

/** Kryptografisk tilfældig nonce (128 bit, base64). Skal være ny for hver request. */
export function generateNonce(): string {
  const bytes = new Uint8Array(16);
  globalThis.crypto.getRandomValues(bytes);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

const SAFE_SOURCE = /^(https:\/\/[a-z0-9.-]+(:\d+)?(\/[^\s;,'"]*)?|wss:\/\/[a-z0-9.-]+(:\d+)?|'self'|data:|blob:)$/i;

/** Afviser kilder med mellemrum/semikolon (forhindrer injektion af ekstra direktiver via konfiguration) */
function sources(list: string[] | undefined): string[] {
  return (list ?? []).map((s) => {
    if (!SAFE_SOURCE.test(s)) throw new Error(`Ugyldig CSP-kilde: ${JSON.stringify(s)}`);
    return s;
  });
}

export function buildCsp(o: CspOptions): string {
  if (!/^[A-Za-z0-9+/=]{16,}$/.test(o.nonce)) throw new Error('Ugyldig nonce');
  const d: Array<[string, string[]]> = [
    ['default-src', ["'self'"]],
    ['script-src', ["'self'", `'nonce-${o.nonce}'`, "'strict-dynamic'", ...(o.isDev ? ["'unsafe-eval'"] : [])]],
    ['style-src', ["'self'", `'nonce-${o.nonce}'`, ...sources(o.styleSrc)]],
    ['style-src-attr', ["'unsafe-inline'"]],
    ['img-src', ["'self'", 'data:', 'blob:', ...sources(o.imgSrc)]],
    ['font-src', ["'self'", ...sources(o.fontSrc)]],
    ['connect-src', ["'self'", ...sources(o.connectSrc), ...(o.isDev ? ['ws:', 'http:'] : [])]],
    ['frame-src', sources(o.frameSrc).length ? sources(o.frameSrc) : ["'none'"]],
    ['object-src', ["'none'"]],
    ['base-uri', ["'self'"]],
    ['form-action', ["'self'"]],
    ['frame-ancestors', ["'none'"]]
  ];
  const parts = d.map(([k, v]) => `${k} ${v.join(' ')}`);
  if (!o.isDev) parts.push('upgrade-insecure-requests');
  if (o.reportUri) parts.push(`report-uri ${sources([o.reportUri])[0]}`);
  return parts.join('; ');
}

export interface SecurityHeaderOptions {
  isProd: boolean;
  /** Svar der aldrig må caches (admin, API med persondata) */
  noStore?: boolean;
  /** Admin må aldrig indekseres */
  noIndex?: boolean;
}

export function securityHeaders(o: SecurityHeaderOptions): Record<string, string> {
  const h: Record<string, string> = {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(self), usb=(), interest-cohort=()',
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Cross-Origin-Resource-Policy': 'same-site',
    'X-DNS-Prefetch-Control': 'off'
  };
  if (o.isProd) h['Strict-Transport-Security'] = 'max-age=63072000; includeSubDomains; preload';
  if (o.noStore) { h['Cache-Control'] = 'no-store, max-age=0'; h['Pragma'] = 'no-cache'; }
  if (o.noIndex) h['X-Robots-Tag'] = 'noindex, nofollow, noarchive';
  return h;
}

export function applySecurityHeaders(target: Headers, o: SecurityHeaderOptions): void {
  for (const [k, v] of Object.entries(securityHeaders(o))) target.set(k, v);
}
