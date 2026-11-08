import { describe, expect, it } from 'vitest';
import { exportJWK, generateKeyPair, SignJWT, createLocalJWKSet } from 'jose';
import { buildCsp, generateNonce, securityHeaders } from './headers';
import { getClientIp, isIpAllowed, parseCidr, parseIp } from './ip';
import { FOUR_EYES_REFUND_THRESHOLD_ORE, PERMISSIONS, ROLES, canApprove, can, needsSecondApproval, permissionForAdminPath } from './rbac';
import { MemoryRateLimiter, limiterKey } from './ratelimit';
import { safeRedirectPath } from './redirect';
import { isRequestOriginAllowed } from './origin';
import { newImageStorageKey, sniffImageType, validateImageUpload } from './upload';
import { AccessError, createAccessVerifier } from './access-jwt';
import { maskEmail, redactForLog, redactString } from './redact';
import { csv, loadEnv } from './env';
import { createAuditor } from './audit';
import { z } from 'zod';

describe('CSP og headers', () => {
  const nonce = generateNonce();
  it('nonce er 128 bit og unik', () => { expect(nonce).toMatch(/^[A-Za-z0-9+/=]{22,}$/); expect(generateNonce()).not.toBe(nonce); });
  it('scripts kræver nonce og tillader aldrig unsafe-inline/eval i produktion', () => {
    const csp = buildCsp({ nonce });
    expect(csp).toContain(`script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`);
    expect(csp).not.toMatch(/script-src[^;]*unsafe/);
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain('upgrade-insecure-requests');
  });
  it('unsafe-eval kun i dev', () => expect(buildCsp({ nonce, isDev: true })).toContain("'unsafe-eval'"));
  it('afviser kilder der kan injicere ekstra direktiver', () => {
    expect(() => buildCsp({ nonce, imgSrc: ["https://a.dk; script-src *"] })).toThrow();
    expect(() => buildCsp({ nonce, connectSrc: ['*'] })).toThrow();
    expect(() => buildCsp({ nonce: "x'; script-src *" })).toThrow();
    expect(buildCsp({ nonce, imgSrc: ['https://cdn.videro.dk'] })).toContain('https://cdn.videro.dk');
  });
  it('HSTS kun i produktion; admin er no-store og noindex', () => {
    expect(securityHeaders({ isProd: false })['Strict-Transport-Security']).toBeUndefined();
    const h = securityHeaders({ isProd: true, noStore: true, noIndex: true });
    expect(h['Strict-Transport-Security']).toMatch(/max-age=63072000/);
    expect(h['Cache-Control']).toContain('no-store');
    expect(h['X-Robots-Tag']).toContain('noindex');
    expect(h['X-Frame-Options']).toBe('DENY');
  });
});

describe('IP-allowlist', () => {
  it('parser IPv4, IPv6 og afviser skrald og tvetydige former', () => {
    expect(parseIp('203.0.113.7')).toMatchObject({ version: 4 });
    expect(parseIp('2001:db8::1')).toMatchObject({ version: 6 });
    for (const bad of ['', 'abc', '256.1.1.1', '1.2.3', '01.2.3.4', '1.2.3.4.5', '::g', '1:2:3:4:5:6:7:8:9', ':::']) expect(parseIp(bad)).toBeNull();
  });
  it('matcher CIDR korrekt, også ved kanter', () => {
    const list = ['203.0.113.0/24', '198.51.100.7', '2001:db8::/32'];
    expect(isIpAllowed('203.0.113.0', list)).toBe(true);
    expect(isIpAllowed('203.0.113.255', list)).toBe(true);
    expect(isIpAllowed('203.0.114.0', list)).toBe(false);
    expect(isIpAllowed('198.51.100.7', list)).toBe(true);
    expect(isIpAllowed('198.51.100.8', list)).toBe(false);
    expect(isIpAllowed('2001:db8:ffff::1', list)).toBe(true);
    expect(isIpAllowed('2001:db9::1', list)).toBe(false);
  });
  it('IPv4-mappet IPv6 kan ikke omgå allowlisten (og heller ikke snige sig ind)', () => {
    expect(isIpAllowed('::ffff:203.0.113.9', ['203.0.113.0/24'])).toBe(true);
    expect(isIpAllowed('::ffff:203.0.114.9', ['203.0.113.0/24'])).toBe(false);
  });
  it('fejler lukket: tom liste, manglende eller ugyldig IP → nej', () => {
    expect(isIpAllowed('203.0.113.1', [])).toBe(false);
    expect(isIpAllowed(null, ['0.0.0.0/0'])).toBe(false);
    expect(isIpAllowed('not-an-ip', ['0.0.0.0/0'])).toBe(false);
  });
  it('slåfejl i allowlisten opdages i stedet for at blive ignoreret', () => {
    expect(() => isIpAllowed('203.0.113.1', ['203.0.113.0/33'])).toThrow();
    expect(() => isIpAllowed('203.0.113.1', ['hej'])).toThrow();
    expect(parseCidr('10.0.0.0/8')).toMatchObject({ prefix: 8 });
  });
  it('klient-IP: Cloudflare-header læses direkte', () => {
    expect(getClientIp(new Headers({ 'cf-connecting-ip': '203.0.113.5' }), { header: 'cf-connecting-ip' })).toBe('203.0.113.5');
    expect(getClientIp(new Headers({ 'cf-connecting-ip': 'junk' }), { header: 'cf-connecting-ip' })).toBeNull();
    expect(getClientIp(new Headers(), { header: 'cf-connecting-ip' })).toBeNull();
  });
  it('X-Forwarded-For: forfalsket venstre side ignoreres; der tælles fra højre', () => {
    // Angriber sender "1.2.3.4" (falsk); proxyen tilføjer sin egen observation til højre.
    const h = new Headers({ 'x-forwarded-for': '1.2.3.4, 203.0.113.99' });
    expect(getClientIp(h, { header: 'x-forwarded-for', trustedProxies: 1 })).toBe('203.0.113.99');
    expect(getClientIp(new Headers({ 'x-forwarded-for': '1.2.3.4, 203.0.113.99, 10.0.0.1' }), { header: 'x-forwarded-for', trustedProxies: 2 })).toBe('203.0.113.99');
    expect(getClientIp(new Headers({ 'x-forwarded-for': '203.0.113.99' }), { header: 'x-forwarded-for', trustedProxies: 3 })).toBeNull();
  });
});

describe('RBAC', () => {
  it('deny-by-default', () => {
    expect(can(undefined, 'user.view')).toBe(false);
    expect(can('hacker', 'user.view')).toBe(false);
    expect(can('admin', 'does.not.exist')).toBe(false);
    expect(can('constructor', 'user.view')).toBe(false);
    expect(can('__proto__', 'user.view')).toBe(false);
  });
  it('mindste rettighed pr. rolle', () => {
    expect(can('support', 'order.refund')).toBe(false);
    expect(can('support', 'user.suspend')).toBe(false);
    expect(can('moderator', 'order.refund')).toBe(false);
    expect(can('finance', 'user.suspend')).toBe(false);
    expect(can('finance', 'order.refund')).toBe(true);
    for (const p of PERMISSIONS) expect(can('admin', p)).toBe(true);
    for (const r of ROLES.filter((r) => r !== 'admin')) { expect(can(r, 'staff.manage')).toBe(false); expect(can(r, 'fees.edit')).toBe(false); }
  });
  it('fire-øjne-princip: store refunderinger og gebyr-/staff-ændringer kræver anden godkender', () => {
    expect(needsSecondApproval('order.refund', FOUR_EYES_REFUND_THRESHOLD_ORE - 1)).toBe(false);
    expect(needsSecondApproval('order.refund', FOUR_EYES_REFUND_THRESHOLD_ORE)).toBe(true);
    expect(needsSecondApproval('order.refund')).toBe(true); // ukendt beløb → streng
    expect(needsSecondApproval('fees.edit', 1)).toBe(true);
    expect(needsSecondApproval('user.view')).toBe(false);
  });
  it('man kan ikke godkende sig selv eller uden rettighed', () => {
    expect(canApprove({ requesterId: 'a', approverId: 'a', approverRole: 'admin', permission: 'order.refund' })).toBe(false);
    expect(canApprove({ requesterId: 'a', approverId: 'b', approverRole: 'support', permission: 'order.refund' })).toBe(false);
    expect(canApprove({ requesterId: 'a', approverId: 'b', approverRole: 'finance', permission: 'order.refund' })).toBe(true);
  });
  it('admin-ruter: ukendte stier afvises', () => {
    expect(permissionForAdminPath('/')).toBe('any-staff');
    expect(permissionForAdminPath('/orders/123')).toBe('order.view');
    expect(permissionForAdminPath('/settings/fees')).toBe('fees.edit');
    expect(permissionForAdminPath('/staffing')).toBeNull(); // ikke prefix-forvekslet med /staff
    expect(permissionForAdminPath('/hemmelig')).toBeNull();
    expect(permissionForAdminPath('/support/abc')).toBe('support.handle');
    expect(permissionForAdminPath('/approvals')).toBe('order.refund'); // kun dem, der selv må refundere, kan godkende
  });
  it('kundeservice: alle roller kan svare kunder, men support kan ikke refundere eller spærre', () => {
    for (const r of ROLES) expect(can(r, 'support.handle')).toBe(true);
    expect(can('support', 'order.refund')).toBe(false);
    expect(can('support', 'user.suspend')).toBe(false);
  });
});

describe('rate limiting', () => {
  it('token bucket: tillader burst, blokerer, og fyldes langsomt op', async () => {
    let t = 0;
    const rl = new MemoryRateLimiter({ capacity: 3, refillPerSecond: 1 }, () => t);
    for (let i = 0; i < 3; i++) expect((await rl.consume('k')).allowed).toBe(true);
    const blocked = await rl.consume('k');
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterMs).toBeGreaterThan(0);
    t += 1000;
    expect((await rl.consume('k')).allowed).toBe(true);
    expect((await rl.consume('k')).allowed).toBe(false);
  });
  it('nøgler er uafhængige, og hukommelsen er begrænset', async () => {
    const rl = new MemoryRateLimiter({ capacity: 1, refillPerSecond: 0.001 }, () => 0, 100);
    expect((await rl.consume('a')).allowed).toBe(true);
    expect((await rl.consume('b')).allowed).toBe(true);
    for (let i = 0; i < 500; i++) await rl.consume(`flood-${i}`);
    expect(limiterKey('login', '203.0.113.1', null)).toBe('login:203.0.113.1:-');
  });
});

describe('åben redirect', () => {
  it('accepterer kun relative stier', () => {
    expect(safeRedirectPath('/orders/1?tab=a#x')).toBe('/orders/1?tab=a#x');
    for (const evil of ['https://evil.example', '//evil.example', '/\\evil.example', '\\\\evil.example', 'javascript:alert(1)', '/%0d%0aSet-Cookie:x', '/%5cevil.example', '/%0a', '/\u0000', 'evil', ' //evil.example']) {
      expect(safeRedirectPath(evil, '/home')).toBe('/home');
    }
    expect(safeRedirectPath(null)).toBe('/');
    expect(safeRedirectPath('/' + 'a'.repeat(3000))).toBe('/');
  });
});

describe('CSRF / origin', () => {
  const allowed = ['https://videro.dk'];
  it('læsende metoder er altid ok', () => expect(isRequestOriginAllowed('GET', new Headers(), allowed)).toBe(true));
  it('POST fra fremmed origin eller cross-site afvises', () => {
    expect(isRequestOriginAllowed('POST', new Headers({ origin: 'https://evil.example' }), allowed)).toBe(false);
    expect(isRequestOriginAllowed('POST', new Headers({ origin: 'https://videro.dk', 'sec-fetch-site': 'cross-site' }), allowed)).toBe(false);
    expect(isRequestOriginAllowed('POST', new Headers(), allowed)).toBe(false);
    expect(isRequestOriginAllowed('POST', new Headers({ referer: 'https://videro.dk.evil.example/x' }), allowed)).toBe(false);
  });
  it('POST fra egen origin accepteres', () => {
    expect(isRequestOriginAllowed('POST', new Headers({ origin: 'https://videro.dk' }), allowed)).toBe(true);
    expect(isRequestOriginAllowed('DELETE', new Headers({ 'sec-fetch-site': 'same-origin' }), allowed)).toBe(true);
  });
});

describe('billed-upload', () => {
  const jpeg = Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, 0, 16, 0x4a, 0x46, 0x49, 0x46, 0, 1]);
  const png = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13]);
  const webp = Uint8Array.from([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]);
  const enc = (s: string) => new TextEncoder().encode(s.padEnd(32, ' '));
  it('genkender jpeg/png/webp ud fra indholdet', () => {
    expect(sniffImageType(jpeg)).toBe('image/jpeg'); expect(sniffImageType(png)).toBe('image/png'); expect(sniffImageType(webp)).toBe('image/webp');
  });
  it('afviser SVG, HTML, GIF, scripts og tomme filer – uanset hvad klienten påstår', () => {
    for (const body of ['<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>', '<html><script>alert(1)</script>', 'GIF89a......', '<?php system($_GET[1]); ?>']) {
      expect(validateImageUpload({ bytes: enc(body), declaredType: 'image/jpeg' })).toEqual({ ok: false, reason: 'unsupported_type' });
    }
    expect(validateImageUpload({ bytes: new Uint8Array(0) })).toEqual({ ok: false, reason: 'empty' });
  });
  it('afviser forkert Content-Type og for store filer', () => {
    expect(validateImageUpload({ bytes: png, declaredType: 'image/jpeg' })).toEqual({ ok: false, reason: 'type_mismatch' });
    expect(validateImageUpload({ bytes: jpeg, maxBytes: 5 })).toEqual({ ok: false, reason: 'too_large' });
    expect(validateImageUpload({ bytes: jpeg, declaredType: 'image/jpeg' })).toEqual({ ok: true, type: 'image/jpeg', extension: 'jpg' });
  });
  it('lagernøgler er server-genererede og indeholder intet brugerinput', () => {
    const { id, key } = newImageStorageKey('image/webp', new Date(Date.UTC(2026, 10, 6)));
    expect(key).toBe(`listings/2026/11/${id}.webp`);
    expect(id).toMatch(/^[0-9a-f-]{36}$/);
  });
});

describe('Cloudflare Access-JWT', () => {
  const AUD = 'aud-123'; const TEAM = 'respin.cloudflareaccess.com';
  async function setup() {
    const { publicKey, privateKey } = await generateKeyPair('RS256');
    const jwk = { ...(await exportJWK(publicKey)), kid: 'k1', alg: 'RS256', use: 'sig' };
    const verify = createAccessVerifier({ teamDomain: TEAM, audience: AUD, jwks: createLocalJWKSet({ keys: [jwk] }) });
    const sign = (claims: Record<string, unknown> = {}, o: { aud?: string; iss?: string; exp?: string | number } = {}) =>
      new SignJWT({ email: 'Mette@Videro.dk', ...claims }).setProtectedHeader({ alg: 'RS256', kid: 'k1' }).setSubject('user-1')
        .setAudience(o.aud ?? AUD).setIssuer(o.iss ?? `https://${TEAM}`).setIssuedAt().setExpirationTime(o.exp ?? '5m').sign(privateKey);
    return { verify, sign };
  }
  it('accepterer gyldigt token og normaliserer e-mail', async () => {
    const { verify, sign } = await setup();
    expect(await verify(await sign())).toEqual({ email: 'mette@videro.dk', subject: 'user-1' });
  });
  it('afviser manglende token', async () => {
    const { verify } = await setup();
    await expect(verify(undefined)).rejects.toMatchObject({ code: 'missing' });
  });
  it('afviser forkert audience (token fra en anden Access-app), forkert issuer og udløbet token', async () => {
    const { verify, sign } = await setup();
    await expect(verify(await sign({}, { aud: 'andet-app' }))).rejects.toBeInstanceOf(AccessError);
    await expect(verify(await sign({}, { iss: 'https://evil.example' }))).rejects.toBeInstanceOf(AccessError);
    await expect(verify(await sign({}, { exp: Math.floor(Date.now() / 1000) - 3600 }))).rejects.toBeInstanceOf(AccessError);
  });
  it('afviser token uden e-mail', async () => {
    const { verify, sign } = await setup();
    await expect(verify(await sign({ email: '' }))).rejects.toMatchObject({ code: 'invalid' });
  });
  it('afviser alg=none og HS256-nøgleforveksling', async () => {
    const { verify } = await setup();
    const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString('base64url');
    const none = `${b64({ alg: 'none', typ: 'JWT' })}.${b64({ email: 'x@videro.dk', sub: 'u', aud: AUD, iss: `https://${TEAM}`, exp: 9999999999 })}.`;
    await expect(verify(none)).rejects.toBeInstanceOf(AccessError);
    const hs = await new SignJWT({ email: 'x@videro.dk' }).setProtectedHeader({ alg: 'HS256', kid: 'k1' }).setSubject('u').setAudience(AUD).setIssuer(`https://${TEAM}`).setExpirationTime('5m').sign(new TextEncoder().encode('any-secret-value-32-bytes-long!!!'));
    await expect(verify(hs)).rejects.toBeInstanceOf(AccessError);
  });
  it('afviser tamperet payload', async () => {
    const { verify, sign } = await setup();
    const [h, , s] = (await sign()).split('.');
    const evil = Buffer.from(JSON.stringify({ email: 'ceo@videro.dk', sub: 'u', aud: AUD, iss: `https://${TEAM}`, exp: 9999999999 })).toString('base64url');
    await expect(verify(`${h}.${evil}.${s}`)).rejects.toBeInstanceOf(AccessError);
  });
});

describe('redaktion af logs', () => {
  it('maskerer nøgler, tokens, kort og CPR', () => {
    const out = redactForLog({ user: 'mette', password: 'hemmelig', headers: { authorization: 'Bearer abcdefghijklmnop', cookie: 'a=b' }, note: 'kort 4242 4242 4242 4242 og cpr 010190-1234', key: 'sk_live_' + 'a'.repeat(24) }) as Record<string, unknown>;
    const s = JSON.stringify(out);
    expect(s).not.toContain('hemmelig'); expect(s).not.toContain('abcdefghijklmnop'); expect(s).not.toContain('4242 4242'); expect(s).not.toContain('010190-1234'); expect(s).not.toContain('sk_live_');
    expect(out.user).toBe('mette');
  });
  it('maskerer e-mail og JWT', () => {
    expect(maskEmail('mette@videro.dk')).toBe('m***@videro.dk');
    expect(redactString('token eyJhbGciOiJSUzI1NiJ9.eyJzdWIiOiIxIn0.c2lnbmF0dXJl')).toContain('[jwt]');
  });
});

describe('miljø-validering og audit', () => {
  it('fail closed og lækker aldrig værdier', () => {
    const schema = z.object({ DATABASE_URL: z.string().min(10), ALLOW: csv });
    expect(() => loadEnv(schema, { DATABASE_URL: 'kort' })).toThrow(/DATABASE_URL/);
    try { loadEnv(schema, { DATABASE_URL: 'hemmelig' }); } catch (e) { expect(String(e)).not.toContain('hemmelig'); }
    expect(loadEnv(schema, { DATABASE_URL: 'postgres://x/y', ALLOW: '1.2.3.4/32, 5.6.7.8/32,' })).toEqual({ DATABASE_URL: 'postgres://x/y', ALLOW: ['1.2.3.4/32', '5.6.7.8/32'] });
  });
  it('audit redigerer metadata og lader ikke en logningsfejl vælte handlingen', async () => {
    const written: unknown[] = []; const errors: unknown[] = [];
    await createAuditor({ write: async (e) => { written.push(e); } }).record({ actorType: 'staff', action: 'order.refund', metadata: { token: 'abc', amount: 5 } });
    expect(JSON.stringify(written[0])).not.toContain('abc');
    await createAuditor({ write: async () => { throw new Error('db nede'); } }, (e) => errors.push(e)).record({ actorType: 'system', action: 'x' });
    expect(errors).toHaveLength(1);
  });
});

import { createAdminGuard, type AdminGuardConfig } from './admin-guard';

describe('admin-guard', () => {
  const ok = { email: 'mette@videro.dk', subject: 'u1' };
  const base = (o: Partial<AdminGuardConfig> = {}): AdminGuardConfig => ({
    isProd: true, allowedHosts: ['admin.videro.dk'], ipAllowlist: ['203.0.113.0/24'], ipHeader: 'cf-connecting-ip',
    verifyAccess: async (t) => { if (t === 'good') return ok; throw new Error('bad'); }, ...o
  });
  const req = (h: Record<string, string>) => new Headers({ host: 'admin.videro.dk', 'cf-connecting-ip': '203.0.113.5', 'cf-access-jwt-assertion': 'good', ...h });

  it('slipper igennem med rigtig host, IP og identitet', async () => {
    expect(await createAdminGuard(base())(req({}))).toEqual({ ok: true, identity: ok, ip: '203.0.113.5' });
  });
  it('forkert Host → 404 (afslører ikke at admin findes)', async () => {
    expect(await createAdminGuard(base())(req({ host: 'videro.dk' }))).toEqual({ ok: false, status: 404, reason: 'host' });
    expect(await createAdminGuard(base())(req({ host: 'admin.videro.dk.evil.example' }))).toMatchObject({ reason: 'host' });
    expect(await createAdminGuard(base())(req({ host: 'ADMIN.videro.dk:443' }))).toMatchObject({ ok: true });
  });
  it('IP uden for allowlist → 403, selv med gyldigt token', async () => {
    expect(await createAdminGuard(base())(req({ 'cf-connecting-ip': '198.51.100.1' }))).toEqual({ ok: false, status: 403, reason: 'ip' });
    expect(await createAdminGuard(base())(new Headers({ host: 'admin.videro.dk', 'cf-access-jwt-assertion': 'good' }))).toMatchObject({ status: 403 }); // ingen IP-header
  });
  it('forfalsket X-Forwarded-For omgår ikke allowlisten', async () => {
    const g = createAdminGuard(base({ ipHeader: 'x-forwarded-for', trustedProxies: 1 }));
    expect(await g(new Headers({ host: 'admin.videro.dk', 'cf-access-jwt-assertion': 'good', 'x-forwarded-for': '203.0.113.5, 198.51.100.66' }))).toMatchObject({ status: 403 });
  });
  it('manglende eller ugyldigt token → 401', async () => {
    const g = createAdminGuard(base());
    expect(await g(req({ 'cf-access-jwt-assertion': 'forged' }))).toEqual({ ok: false, status: 401, reason: 'unauthenticated' });
    const h = req({}); h.delete('cf-access-jwt-assertion');
    expect(await g(h)).toMatchObject({ status: 401 });
  });
  it('fejler lukket ved opstart: tom allowlist i produktion, manglende hosts, dev-identitet i produktion', () => {
    expect(() => createAdminGuard(base({ ipAllowlist: [] }))).toThrow(/ALLOWLIST/);
    expect(() => createAdminGuard(base({ allowedHosts: [] }))).toThrow(/ALLOWED_HOSTS/);
    expect(() => createAdminGuard(base({ devIdentity: ok }))).toThrow(/produktion/);
    expect(() => createAdminGuard(base({ ipAllowlist: ['nonsens'] }))).toThrow(/CIDR/);
    expect(() => createAdminGuard(base({ ipAllowlist: [], ipAllowlistDisabled: true }))).not.toThrow(); // bevidst fravalg
  });
  it('dev-identitet virker kun uden for produktion', async () => {
    const g = createAdminGuard(base({ isProd: false, allowedHosts: [], ipAllowlist: [], devIdentity: ok }));
    expect(await g(new Headers({ host: 'localhost:3001' }))).toMatchObject({ ok: true, identity: ok });
    expect(await g(new Headers({ host: 'evil.example' }))).toMatchObject({ status: 404 });
  });
});
