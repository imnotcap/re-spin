import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { randomBytes } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { schema, type Db } from '@respin/db';
import { createTestDb } from '@respin/db/testing';
import { MemoryRateLimiter } from '@respin/security';
import { base32Decode, base32Encode, createAuth, hotp, MemoryMailer, open, parseKey, seal, totpAt } from './index';
import { SoftAuthenticator } from './webauthn-testkit';

let db: Db, close: () => Promise<void>;
beforeAll(async () => { ({ db, close } = await createTestDb()); });
afterAll(async () => { await close(); });

const APP = 'https://respin.dk';
const PW = 'grøn uldjakke på loppemarked';
const MFA_KEY = randomBytes(32).toString('base64');
let n = 0;

function setup() {
  let clock = new Date('2026-11-06T10:00:00Z');
  const mailer = new MemoryMailer();
  const auth = createAuth({ db, mailer, appUrl: APP, mfaKey: MFA_KEY, now: () => clock, limiter: (cfg) => new MemoryRateLimiter(cfg, () => clock.getTime()) });
  const tokenOf = (l: string) => new URL(l).searchParams.get('token')!;
  return { auth, mailer, tokenOf, clock: () => clock, advance: (ms: number) => { clock = new Date(clock.getTime() + ms); } };
}
type S = ReturnType<typeof setup>;
async function user(s: S) {
  const email = `bruger${++n}@example.dk`;
  await s.auth.signUp({ email, password: PW, displayName: 'Mette' }, { ip: `10.1.${n}.1` });
  const r = await s.auth.verifyEmail({ token: s.tokenOf(s.mailer.linkFrom()), password: PW });
  if (!r.ok) throw new Error(r.error);
  const cur = (await s.auth.getSession(r.session.token))!;
  return { email, token: r.session.token, cur, id: cur.user.id };
}
async function elevated(s: S, u: Awaited<ReturnType<typeof user>>) {
  await s.auth.reauthenticate(u.token, PW);
  return (await s.auth.getSession(u.token))!;
}
async function enableTotp(s: S, u: Awaited<ReturnType<typeof user>>) {
  const cur = await elevated(s, u);
  const setup = await s.auth.mfa.beginTotpSetup(cur); if (!setup.ok) throw new Error(setup.error);
  const secret = base32Decode(setup.secret);
  const conf = await s.auth.mfa.confirmTotpSetup(cur, totpAt(secret, s.clock().getTime())); if (!conf.ok) throw new Error(conf.error);
  s.advance(31_000); // næste tidstrin, så en ny kode kan bruges
  return { secret, recoveryCodes: conf.recoveryCodes };
}

describe('TOTP (RFC 6238 testvektorer)', () => {
  const secret = Buffer.from('12345678901234567890');
  it.each([[59, '94287082'], [1111111109, '07081804'], [1234567890, '89005924'], [2000000000, '69279037']])('t=%i → %s', (t, code) => {
    expect(totpAt(secret, t * 1000, 8)).toBe(code);
  });
  it('HOTP (RFC 4226 testvektorer)', () => {
    expect([0, 1, 2, 9].map((c) => hotp(secret, c))).toEqual(['755224', '287082', '359152', '520489']);
  });
  it('base32 frem og tilbage', () => {
    const b = randomBytes(20);
    expect(base32Decode(base32Encode(b)).equals(b)).toBe(true);
    expect(base32Encode(Buffer.from('foobar'))).toBe('MZXW6YTBOI');
  });
});

describe('kryptering af hemmeligheder', () => {
  const key = parseKey(MFA_KEY);
  it('kan dekrypteres med rigtig nøgle og samme bruger', () => expect(open(key, seal(key, 'hemmelig', 'u1'), 'u1')).toBe('hemmelig'));
  it('manipulation, forkert bruger (AAD) og forkert nøgle opdages', () => {
    const sealed = seal(key, 'hemmelig', 'u1');
    expect(() => open(key, sealed, 'u2')).toThrow();
    const parts = sealed.split('.'); parts[2] = Buffer.from('xxxxxxxx').toString('base64url');
    expect(() => open(key, parts.join('.'), 'u1')).toThrow();
    expect(() => open(randomBytes(32), sealed, 'u1')).toThrow();
    expect(() => parseKey(randomBytes(16).toString('base64'))).toThrow();
  });
});

describe('to-trins-login (TOTP)', () => {
  it('opsætning kræver genbekræftelse og en gyldig kode; hemmeligheden gemmes krypteret', async () => {
    const s = setup(); const u = await user(s);
    expect(await s.auth.mfa.beginTotpSetup(u.cur)).toEqual({ ok: false, error: 'reauth_required' });
    const cur = await elevated(s, u);
    const st = await s.auth.mfa.beginTotpSetup(cur); if (!st.ok) throw new Error();
    expect(st.uri).toMatch(/^otpauth:\/\/totp\/re%3Aspin%3A/);
    const [row] = await db.select().from(schema.mfaTotp).where(eq(schema.mfaTotp.userId, u.id));
    expect(row!.secretEnc).not.toContain(st.secret);
    expect(await s.auth.mfa.confirmTotpSetup(cur, '000000')).toEqual({ ok: false, error: 'invalid_code' });
    const ok = await s.auth.mfa.confirmTotpSetup(cur, totpAt(base32Decode(st.secret), s.clock().getTime()));
    expect(ok.ok && ok.recoveryCodes).toHaveLength(10);
    expect(s.mailer.sent.at(-1)?.subject).toMatch(/Sikkerhedsændring/);
  });
  it('login med adgangskode giver INGEN session før koden er tastet', async () => {
    const s = setup(); const u = await user(s); const { secret } = await enableTotp(s, u);
    const r = await s.auth.signIn({ email: u.email, password: PW });
    expect(r).toMatchObject({ ok: false, error: 'mfa_required', mfaToken: expect.any(String) });
    if (r.ok || !r.mfaToken) return;
    const sessionsBefore = (await s.auth.listSessions(u.id)).length;
    expect(await s.auth.mfa.verifyLogin({ mfaToken: r.mfaToken, code: '123456' })).toMatchObject({ ok: false, error: 'invalid_code' });
    expect((await s.auth.listSessions(u.id)).length).toBe(sessionsBefore);
    const ok = await s.auth.mfa.verifyLogin({ mfaToken: r.mfaToken, code: totpAt(secret, s.clock().getTime()) });
    expect(ok.ok).toBe(true); if (!ok.ok) return;
    const [sess] = await db.select().from(schema.sessions).where(eq(schema.sessions.userId, u.id)).orderBy(schema.sessions.createdAt);
    expect((await db.select({ m: schema.sessions.authMethod }).from(schema.sessions).where(eq(schema.sessions.userId, u.id))).map((x) => x.m)).toContain('password+totp');
    expect(sess).toBeDefined();
    expect(await s.auth.mfa.verifyLogin({ mfaToken: r.mfaToken, code: totpAt(secret, s.clock().getTime()) })).toMatchObject({ ok: false, error: 'expired' }); // engangs
  });
  it('samme kode kan ikke bruges to gange (genafspilning)', async () => {
    const s = setup(); const u = await user(s); const { secret } = await enableTotp(s, u);
    const code = totpAt(secret, s.clock().getTime());
    const a = await s.auth.signIn({ email: u.email, password: PW }); const b = await s.auth.signIn({ email: u.email, password: PW });
    if (a.ok || b.ok) throw new Error();
    expect((await s.auth.mfa.verifyLogin({ mfaToken: a.mfaToken!, code })).ok).toBe(true);
    expect(await s.auth.mfa.verifyLogin({ mfaToken: b.mfaToken!, code })).toMatchObject({ ok: false, error: 'invalid_code' });
  });
  it('samme kode brugt SAMTIDIG i to logins: kun ét lykkes (atomisk vagt i databasen)', async () => {
    const s = setup(); const u = await user(s); const { secret } = await enableTotp(s, u);
    const code = totpAt(secret, s.clock().getTime());
    const a = await s.auth.signIn({ email: u.email, password: PW }); const b = await s.auth.signIn({ email: u.email, password: PW });
    if (a.ok || b.ok) throw new Error();
    const results = await Promise.all([a, b].map((x) => s.auth.mfa.verifyLogin({ mfaToken: x.mfaToken!, code })));
    expect(results.filter((r) => r.ok)).toHaveLength(1);
  });
  it('maks. 5 forsøg pr. login – også med den rigtige kode bagefter', async () => {
    const s = setup(); const u = await user(s); const { secret } = await enableTotp(s, u);
    const r = await s.auth.signIn({ email: u.email, password: PW }); if (r.ok) throw new Error();
    for (let k = 0; k < 5; k++) await s.auth.mfa.verifyLogin({ mfaToken: r.mfaToken!, code: String(100000 + k) });
    expect(await s.auth.mfa.verifyLogin({ mfaToken: r.mfaToken!, code: totpAt(secret, s.clock().getTime()) })).toMatchObject({ ok: false, error: 'too_many_attempts' });
  });
  it('samtidige gæt kan ikke omgå forsøgsgrænsen', async () => {
    const s = setup(); const u = await user(s); await enableTotp(s, u);
    const r = await s.auth.signIn({ email: u.email, password: PW }); if (r.ok) throw new Error();
    await Promise.all(Array.from({ length: 12 }, (_, k) => s.auth.mfa.verifyLogin({ mfaToken: r.mfaToken!, code: String(200000 + k) })));
    const [p] = await db.select().from(schema.mfaPending).where(eq(schema.mfaPending.userId, u.id));
    expect(p!.attempts).toBeLessThanOrEqual(5);
  });
  it('ventende login udløber efter 5 minutter', async () => {
    const s = setup(); const u = await user(s); const { secret } = await enableTotp(s, u);
    const r = await s.auth.signIn({ email: u.email, password: PW }); if (r.ok) throw new Error();
    s.advance(6 * 60_000);
    expect(await s.auth.mfa.verifyLogin({ mfaToken: r.mfaToken!, code: totpAt(secret, s.clock().getTime()) })).toMatchObject({ ok: false, error: 'expired' });
  });
  it('gendannelseskode virker præcis én gang og udløser en advarselsmail', async () => {
    const s = setup(); const u = await user(s); const { recoveryCodes } = await enableTotp(s, u);
    const code = recoveryCodes[0]!;
    const a = await s.auth.signIn({ email: u.email, password: PW }); if (a.ok) throw new Error();
    expect((await s.auth.mfa.verifyLogin({ mfaToken: a.mfaToken!, code: code.toLowerCase() })).ok).toBe(true);
    expect(s.mailer.sent.at(-1)?.text).toMatch(/gendannelseskode/);
    const b = await s.auth.signIn({ email: u.email, password: PW }); if (b.ok) throw new Error();
    expect(await s.auth.mfa.verifyLogin({ mfaToken: b.mfaToken!, code })).toMatchObject({ ok: false });
    expect((await s.auth.mfa.status(u.id)).recoveryCodesLeft).toBe(9);
    const [stored] = await db.select().from(schema.mfaRecoveryCodes).where(eq(schema.mfaRecoveryCodes.userId, u.id));
    expect(stored!.codeHash).not.toContain(code.replace(/-/g, ''));
  });
  it('slå fra kræver genbekræftelse OG en gyldig kode', async () => {
    const s = setup(); const u = await user(s); const { secret } = await enableTotp(s, u);
    s.advance(11 * 60_000);
    const cur = (await s.auth.getSession(u.token))!;
    expect(await s.auth.mfa.disableTotp(cur, totpAt(secret, s.clock().getTime()))).toEqual({ ok: false, error: 'reauth_required' });
    const el = await elevated(s, u);
    expect(await s.auth.mfa.disableTotp(el, '999999')).toEqual({ ok: false, error: 'invalid_code' });
    expect(await s.auth.mfa.disableTotp(el, totpAt(secret, s.clock().getTime()))).toEqual({ ok: true });
    expect((await s.auth.signIn({ email: u.email, password: PW })).ok).toBe(true);
  });
});

describe('passkeys (WebAuthn)', () => {
  async function withPasskey(s: S) {
    const u = await user(s); const cur = await elevated(s, u);
    const kit = new SoftAuthenticator(APP, 'respin.dk');
    const opt = await s.auth.passkeys.registrationOptions(cur); if (!opt.ok) throw new Error(opt.error);
    expect(opt.options.rp.id).toBe('respin.dk');
    expect(opt.options.authenticatorSelection).toMatchObject({ residentKey: 'required', userVerification: 'required' });
    expect(await s.auth.passkeys.verifyRegistration(cur, kit.register(opt.options) as never, 'iPhone')).toEqual({ ok: true });
    return { u, kit };
  }
  const login = async (s: S, kit: SoftAuthenticator, userId: string, o: Parameters<SoftAuthenticator['login']>[2] = {}) => {
    const opt = await s.auth.passkeys.loginOptions(); if (!opt.ok) throw new Error();
    return s.auth.passkeys.verifyLogin(kit.login(opt.options, userId, o) as never);
  };

  it('registrering kræver genbekræftelse', async () => {
    const s = setup(); const u = await user(s);
    expect(await s.auth.passkeys.registrationOptions(u.cur)).toEqual({ ok: false, error: 'reauth_required' });
  });
  it('registrering og login uden adgangskode (tæller som to faktorer, også når TOTP er slået til)', async () => {
    const s = setup(); const { u, kit } = await withPasskey(s);
    await enableTotp(s, u);
    const r = await login(s, kit, u.id);
    expect(r.ok).toBe(true);
    expect((await db.select({ m: schema.sessions.authMethod }).from(schema.sessions).where(eq(schema.sessions.userId, u.id))).map((x) => x.m)).toContain('passkey');
    const [cred] = await db.select().from(schema.webauthnCredentials).where(eq(schema.webauthnCredentials.userId, u.id));
    expect(cred).toMatchObject({ name: 'iPhone', backedUp: true, counter: 1 });
  });
  it('phishing: svar fra et falsk domæne (origin) eller til et andet RP ID afvises', async () => {
    const s = setup(); const { u, kit } = await withPasskey(s);
    expect(await login(s, kit, u.id, { origin: 'https://respin.dk.evil.example' })).toEqual({ ok: false, error: 'invalid_passkey' });
    expect(await login(s, kit, u.id, { rpId: 'evil.example' })).toEqual({ ok: false, error: 'invalid_passkey' });
  });
  it('signatur fra en anden nøgle (forfalsket) afvises', async () => {
    const s = setup(); const { u, kit } = await withPasskey(s);
    expect(await login(s, kit, u.id, { signWith: new SoftAuthenticator(APP, 'respin.dk') })).toEqual({ ok: false, error: 'invalid_passkey' });
  });
  it('uden brugerverifikation (UV) afvises', async () => {
    const s = setup(); const { u, kit } = await withPasskey(s);
    expect(await login(s, kit, u.id, { uv: false })).toEqual({ ok: false, error: 'invalid_passkey' });
  });
  it('genafspillet svar (samme challenge) afvises', async () => {
    const s = setup(); const { u, kit } = await withPasskey(s);
    const opt = await s.auth.passkeys.loginOptions(); if (!opt.ok) throw new Error();
    const response = kit.login(opt.options, u.id) as never;
    expect((await s.auth.passkeys.verifyLogin(response)).ok).toBe(true);
    expect(await s.auth.passkeys.verifyLogin(response)).toEqual({ ok: false, error: 'invalid_passkey' });
  });
  it('genafspilning afvises også for passkeys med tæller 0 (fx Apple) – her er engangs-challengen eneste værn', async () => {
    const s = setup(); const { u, kit } = await withPasskey(s);
    const opt = await s.auth.passkeys.loginOptions(); if (!opt.ok) throw new Error();
    const response = kit.login(opt.options, u.id, { counter: 0 }) as never;
    expect((await s.auth.passkeys.verifyLogin(response)).ok).toBe(true);
    expect(await s.auth.passkeys.verifyLogin(response)).toEqual({ ok: false, error: 'invalid_passkey' });
  });
  it('udløbet challenge (5 min.) afvises', async () => {
    const s = setup(); const { u, kit } = await withPasskey(s);
    const opt = await s.auth.passkeys.loginOptions(); if (!opt.ok) throw new Error();
    s.advance(6 * 60_000);
    expect(await s.auth.passkeys.verifyLogin(kit.login(opt.options, u.id) as never)).toEqual({ ok: false, error: 'invalid_passkey' });
  });
  it('klonet nøgle: faldende signaturtæller afvises og logges', async () => {
    const s = setup(); const { u, kit } = await withPasskey(s);
    expect((await login(s, kit, u.id, { counter: 10 })).ok).toBe(true);
    expect(await login(s, kit, u.id, { counter: 5 })).toEqual({ ok: false, error: 'invalid_passkey' });
    const logs = await db.select().from(schema.auditLog).where(eq(schema.auditLog.actorId, u.id));
    expect(logs.map((l) => l.action)).toContain('auth.passkey.counter_regression');
  });
  it('userHandle der peger på en anden bruger afvises', async () => {
    const s = setup(); const { kit } = await withPasskey(s); const other = await user(s);
    expect(await login(s, kit, other.id)).toEqual({ ok: false, error: 'invalid_passkey' });
  });
  it('spærret konto kan ikke logge ind med passkey', async () => {
    const s = setup(); const { u, kit } = await withPasskey(s);
    await db.update(schema.users).set({ status: 'suspended' }).where(eq(schema.users.id, u.id));
    expect(await login(s, kit, u.id)).toEqual({ ok: false, error: 'invalid_passkey' });
  });
  it('registrering med forkert origin afvises, og en challenge kan ikke bruges af en anden bruger', async () => {
    const s = setup(); const a = await user(s); const b = await user(s);
    const ca = await elevated(s, a); const cb = await elevated(s, b);
    const opt = await s.auth.passkeys.registrationOptions(ca); if (!opt.ok) throw new Error();
    const kit = new SoftAuthenticator(APP, 'respin.dk');
    expect(await s.auth.passkeys.verifyRegistration(cb, kit.register(opt.options) as never, 'x')).toEqual({ ok: false, error: 'invalid_passkey' });
    const opt2 = await s.auth.passkeys.registrationOptions(ca); if (!opt2.ok) throw new Error();
    expect(await s.auth.passkeys.verifyRegistration(ca, kit.register(opt2.options, { origin: 'https://evil.example' }) as never, 'x')).toEqual({ ok: false, error: 'invalid_passkey' });
  });
  it('man kan kun fjerne sine egne passkeys, og det kræver genbekræftelse', async () => {
    const s = setup(); const { u, kit } = await withPasskey(s); const other = await user(s);
    expect(await s.auth.passkeys.remove(await elevated(s, other), kit.id)).toEqual({ ok: false, error: 'not_found' });
    s.advance(11 * 60_000);
    expect(await s.auth.passkeys.remove((await s.auth.getSession(u.token))!, kit.id)).toEqual({ ok: false, error: 'reauth_required' });
    expect(await s.auth.passkeys.remove(await elevated(s, u), kit.id)).toEqual({ ok: true });
    expect(await login(s, kit, u.id)).toEqual({ ok: false, error: 'invalid_passkey' });
  });
});
