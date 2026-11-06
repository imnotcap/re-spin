import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { hash as argonHash } from '@node-rs/argon2';
import { schema, type Db } from '@respin/db';
import { createTestDb } from '@respin/db/testing';
import { MemoryRateLimiter } from '@respin/security';
import { argon2Hasher, checkPasswordPolicy, createAuth, createPwnedChecker, MemoryMailer, PgRateLimiter, sessionCookieName, sessionCookieOptions, sha256Hex, type PasswordHasher } from './index';

let db: Db, close: () => Promise<void>;
beforeAll(async () => { ({ db, close } = await createTestDb()); });
afterAll(async () => { await close(); });

const APP = 'https://respin.dk';
const PW = 'grøn-uldjakke-2026';
let n = 0;
const email = (name = 'mette') => `${name}${++n}@example.dk`;

function setup(opts: { pwned?: (p: string) => Promise<number | null>; hasher?: PasswordHasher; pgLimiter?: boolean } = {}) {
  let clock = new Date('2026-11-06T10:00:00Z');
  const mailer = new MemoryMailer();
  const auth = createAuth({
    db, mailer, appUrl: APP, now: () => clock, pwned: opts.pwned, hasher: opts.hasher,
    limiter: (cfg) => (opts.pgLimiter ? new PgRateLimiter(db, cfg, () => clock) : new MemoryRateLimiter(cfg, () => clock.getTime()))
  });
  const tokenOf = (link: string) => new URL(link).searchParams.get('token')!;
  return { auth, mailer, tokenOf, advance: (ms: number) => { clock = new Date(clock.getTime() + ms); } };
}

/** Opret og aktivér en konto; returnerer session-token */
async function verifiedUser(s: ReturnType<typeof setup>, mail = email(), pw = PW) {
  await s.auth.signUp({ email: mail, password: pw, displayName: 'Mette' }, { ip: `10.0.${n}.1` });
  const r = await s.auth.verifyEmail({ token: s.tokenOf(s.mailer.linkFrom()), password: pw }, { ip: `10.0.${n}.1` });
  if (!r.ok) throw new Error(r.error);
  return { mail, token: r.session.token };
}

describe('tilmelding og bekræftelse', () => {
  it('ny konto: mail med link (bygget ud fra APP_URL), kan ikke logge ind før bekræftelse', async () => {
    const s = setup(); const m = email();
    expect(await s.auth.signUp({ email: m, password: PW, displayName: 'Mette' })).toEqual({ ok: true });
    expect(s.mailer.sent[0]).toMatchObject({ to: m, subject: expect.stringContaining('Bekræft') });
    expect(s.mailer.linkFrom()).toMatch(/^https:\/\/respin\.dk\/verify-email\?token=/);
    expect(await s.auth.signIn({ email: m, password: PW })).toEqual({ ok: false, error: 'email_not_verified' });
  });
  it('aktivering kræver link OG adgangskode; linket kan kun bruges én gang', async () => {
    const s = setup(); const m = email();
    await s.auth.signUp({ email: m, password: PW, displayName: 'Mette' });
    const token = s.tokenOf(s.mailer.linkFrom());
    expect(await s.auth.verifyEmail({ token, password: 'forkert-adgangskode' })).toEqual({ ok: false, error: 'invalid_credentials' });
    const ok = await s.auth.verifyEmail({ token, password: PW });
    expect(ok.ok).toBe(true);
    expect(await s.auth.verifyEmail({ token, password: PW })).toEqual({ ok: false, error: 'invalid_or_expired' });
  });
  it('udløbet link (24 t) virker ikke', async () => {
    const s = setup(); const m = email();
    await s.auth.signUp({ email: m, password: PW, displayName: 'Mette' });
    s.advance(25 * 3_600_000);
    expect(await s.auth.verifyEmail({ token: s.tokenOf(s.mailer.linkFrom()), password: PW })).toEqual({ ok: false, error: 'invalid_or_expired' });
  });
  it('e-mail normaliseres (store bogstaver/mellemrum giver ikke en ny konto)', async () => {
    const s = setup(); const { mail } = await verifiedUser(s);
    expect((await s.auth.signIn({ email: `  ${mail.toUpperCase()} `, password: PW })).ok).toBe(true);
  });
});

describe('ingen brugerenumerering', () => {
  it('tilmelding med eksisterende e-mail giver samme svar – ejeren får en advarselsmail', async () => {
    const s = setup(); const { mail } = await verifiedUser(s);
    s.mailer.sent.length = 0;
    expect(await s.auth.signUp({ email: mail, password: 'en-helt-anden-kode-99', displayName: 'Angriber' })).toEqual({ ok: true });
    expect(s.mailer.sent[0]?.subject).toMatch(/Forsøg på at oprette/);
    expect((await s.auth.signIn({ email: mail, password: PW })).ok).toBe(true); // adgangskoden er IKKE ændret
  });
  it('ukendt e-mail og forkert adgangskode giver samme fejl, og ukendt e-mail kører stadig en hash-verifikation', async () => {
    let verifies = 0;
    const counting: PasswordHasher = { ...argon2Hasher, verify: async (h, p) => { verifies++; return argon2Hasher.verify(h, p); } };
    const s = setup({ hasher: counting }); const { mail } = await verifiedUser(s);
    verifies = 0;
    const wrong = await s.auth.signIn({ email: mail, password: 'forkert-forkert-forkert' });
    const unknown = await s.auth.signIn({ email: email('findesikke'), password: 'forkert-forkert-forkert' });
    expect(wrong).toEqual(unknown);
    expect(unknown).toEqual({ ok: false, error: 'invalid_credentials' });
    expect(verifies).toBe(2); // også for den ukendte e-mail (ens svartid)
  });
  it('"glemt adgangskode" svarer ens for ukendt og kendt e-mail', async () => {
    const s = setup(); const { mail } = await verifiedUser(s);
    s.mailer.sent.length = 0;
    expect(await s.auth.requestPasswordReset({ email: email('ukendt') })).toEqual({ ok: true });
    expect(s.mailer.sent).toHaveLength(0);
    expect(await s.auth.requestPasswordReset({ email: mail })).toEqual({ ok: true });
    expect(s.mailer.sent).toHaveLength(1);
    expect(await s.auth.requestPasswordReset({ email: 'ikke-en-email' })).toEqual({ ok: true });
  });
});

describe('account pre-hijacking', () => {
  it('angriber opretter først med offerets e-mail; offeret opretter bagefter → angriberens adgangskode virker aldrig', async () => {
    const s = setup(); const victim = email('offer');
    await s.auth.signUp({ email: victim, password: 'angriberens-kode-1234', displayName: 'Angriber' }, { ip: '6.6.6.6' });
    const attackerLink = s.tokenOf(s.mailer.linkFrom());
    await s.auth.signUp({ email: victim, password: PW, displayName: 'Offer' }, { ip: '1.1.1.1' });
    const victimLink = s.tokenOf(s.mailer.linkFrom());
    expect(await s.auth.verifyEmail({ token: attackerLink, password: 'angriberens-kode-1234' })).toEqual({ ok: false, error: 'invalid_or_expired' });
    expect((await s.auth.verifyEmail({ token: victimLink, password: PW })).ok).toBe(true);
    expect(await s.auth.signIn({ email: victim, password: 'angriberens-kode-1234' })).toEqual({ ok: false, error: 'invalid_credentials' });
  });
  it('angriber opretter EFTER offeret → offeret kan ikke aktivere med angriberens link uden angriberens kode; nulstilling fjerner angriberen', async () => {
    const s = setup(); const victim = email('offer');
    await s.auth.signUp({ email: victim, password: PW, displayName: 'Offer' });
    await s.auth.signUp({ email: victim, password: 'angriberens-kode-1234', displayName: 'Angriber' });
    const latest = s.tokenOf(s.mailer.linkFrom());
    expect(await s.auth.verifyEmail({ token: latest, password: PW })).toEqual({ ok: false, error: 'invalid_credentials' });
    await s.auth.requestPasswordReset({ email: victim });
    expect(await s.auth.resetPassword({ token: s.tokenOf(s.mailer.linkFrom()), password: 'offerets-nye-kode-2026' })).toEqual({ ok: true });
    expect(await s.auth.signIn({ email: victim, password: 'angriberens-kode-1234' })).toEqual({ ok: false, error: 'invalid_credentials' });
    expect((await s.auth.signIn({ email: victim, password: 'offerets-nye-kode-2026' })).ok).toBe(true);
  });
});

describe('adgangskoder', () => {
  it('politik: længde frem for kompleksitet; afviser åbenlyst svage', () => {
    expect(checkPasswordPolicy('kort')).toBe('too_short');
    expect(checkPasswordPolicy('a'.repeat(129))).toBe('too_long');
    expect(checkPasswordPolicy('aaaaaaaaaaaaaa')).toBe('repetitive');
    expect(checkPasswordPolicy('Password12345!')).toBe('too_common');
    expect(checkPasswordPolicy('mette.hansen2026', { email: 'mette.hansen@x.dk' })).toBe('contains_email');
    expect(checkPasswordPolicy('grøn uldjakke på loppemarked')).toBeNull(); // lange passphrases er gode
  });
  it('afviser lækkede adgangskoder ved tilmelding og nulstilling', async () => {
    const s = setup({ pwned: async () => 3_861_493 });
    expect(await s.auth.signUp({ email: email(), password: PW, displayName: 'Mette' })).toEqual({ ok: false, error: 'breached_password' });
  });
  it('HIBP-tjek sender kun 5 tegn af hashen og fejler åbent hvis tjenesten er nede', async () => {
    const urls: string[] = [];
    const sha = 'CBFDAC6008F9CAB4083784CBD1874F76618D2A97'; // SHA-1("password123")
    const fake = (async (url: string) => { urls.push(url); return new Response(`0018A45C4D1DEF81644B54AB7F969B88D65:1\n${sha.slice(5)}:251682\n`); }) as unknown as typeof fetch;
    expect(await createPwnedChecker({ fetch: fake })('password123')).toBe(251682);
    expect(urls[0]).toBe(`https://api.pwnedpasswords.com/range/${sha.slice(0, 5)}`);
    expect(urls[0]).not.toContain('password123');
    const down = (async () => { throw new Error('nede'); }) as unknown as typeof fetch;
    expect(await createPwnedChecker({ fetch: down })('x')).toBeNull();
  });
  it('gemmes som Argon2id; svage gamle hashes opgraderes ved login', async () => {
    const s = setup(); const { mail } = await verifiedUser(s);
    const [u] = await db.select({ id: schema.users.id }).from(schema.users).where(eq(schema.users.emailNormalized, mail));
    const weak = await argonHash(PW, { algorithm: 2, memoryCost: 4096, timeCost: 1, parallelism: 1 });
    await db.update(schema.userPasswords).set({ hash: weak }).where(eq(schema.userPasswords.userId, u!.id));
    expect((await s.auth.signIn({ email: mail, password: PW })).ok).toBe(true);
    const [pw] = await db.select().from(schema.userPasswords).where(eq(schema.userPasswords.userId, u!.id));
    expect(pw!.hash).toMatch(/^\$argon2id\$v=19\$m=19456,t=2,p=1\$/);
  });
});

describe('sessioner', () => {
  it('kun hash af tokenet gemmes', async () => {
    const s = setup(); const { token } = await verifiedUser(s);
    const [row] = await db.select().from(schema.sessions).where(eq(schema.sessions.tokenHash, sha256Hex(token)));
    expect(row!.tokenHash).not.toBe(token);
    expect(await db.select().from(schema.sessions).where(eq(schema.sessions.tokenHash, token))).toHaveLength(0);
    expect(token.length).toBeGreaterThanOrEqual(43); // 256 bit
  });
  it('udløber efter inaktivitet (7 dage) og absolut (30 dage) – aktivitet forlænger kun inaktivitets-fristen', async () => {
    const s = setup(); const { token } = await verifiedUser(s);
    s.advance(6 * 24 * 3_600_000); expect(await s.auth.getSession(token)).not.toBeNull();
    s.advance(6 * 24 * 3_600_000); expect(await s.auth.getSession(token)).not.toBeNull();
    s.advance(8 * 24 * 3_600_000); expect(await s.auth.getSession(token)).toBeNull(); // inaktiv for længe
    const b = await verifiedUser(s);
    for (let i = 0; i < 6; i++) { s.advance(5 * 24 * 3_600_000); await s.auth.getSession(b.token); }
    expect(await s.auth.getSession(b.token)).toBeNull(); // 30 dage absolut
  });
  it('log ud, log ud overalt, og spærret konto', async () => {
    const s = setup(); const { mail, token } = await verifiedUser(s);
    const second = await s.auth.signIn({ email: mail, password: PW }); if (!second.ok) throw new Error();
    expect(second.session.token).not.toBe(token); // nyt token ved hvert login
    await s.auth.signOut(token);
    expect(await s.auth.getSession(token)).toBeNull();
    expect(await s.auth.getSession(second.session.token)).not.toBeNull();
    const cur = (await s.auth.getSession(second.session.token))!;
    await s.auth.signOutEverywhere(cur.user.id);
    expect(await s.auth.getSession(second.session.token)).toBeNull();
    const third = await s.auth.signIn({ email: mail, password: PW }); if (!third.ok) throw new Error();
    await db.update(schema.users).set({ status: 'suspended' }).where(eq(schema.users.emailNormalized, mail));
    expect(await s.auth.getSession(third.session.token)).toBeNull();
    expect(await s.auth.signIn({ email: mail, password: PW })).toEqual({ ok: false, error: 'account_disabled' });
  });
  it('man kan kun tilbagekalde sine egne sessioner', async () => {
    const s = setup(); const a = await verifiedUser(s); const b = await verifiedUser(s);
    const ca = (await s.auth.getSession(a.token))!; const cb = (await s.auth.getSession(b.token))!;
    expect(await s.auth.revokeSession(ca.user.id, cb.session.id)).toBe(false);
    expect(await s.auth.getSession(b.token)).not.toBeNull();
    expect(await s.auth.revokeSession(cb.user.id, cb.session.id)).toBe(true);
  });
  it('ugyldige og absurde tokens giver null uden fejl', async () => {
    const s = setup();
    for (const t of [null, undefined, '', 'x', 'a'.repeat(5000), "' OR 1=1 --"]) expect(await s.auth.getSession(t)).toBeNull();
  });
  it('cookie: __Host- i produktion (Secure, Path=/, intet Domain), HttpOnly og SameSite=Lax', () => {
    expect(sessionCookieName(true)).toBe('__Host-respin_session');
    expect(sessionCookieOptions(true, new Date())).toMatchObject({ httpOnly: true, secure: true, sameSite: 'lax', path: '/' });
    expect(sessionCookieOptions(true, new Date())).not.toHaveProperty('domain');
  });
});

describe('nulstilling af adgangskode', () => {
  it('ny adgangskode logger ud overalt, linket kan kun bruges én gang og udløber efter 30 min.', async () => {
    const s = setup(); const { mail, token } = await verifiedUser(s);
    await s.auth.requestPasswordReset({ email: mail });
    const t1 = s.tokenOf(s.mailer.linkFrom());
    expect(await s.auth.resetPassword({ token: t1, password: 'kort' })).toEqual({ ok: false, error: 'too_short' });
    expect(await s.auth.resetPassword({ token: t1, password: 'en-ny-og-lang-kode-2026' })).toEqual({ ok: true });
    expect(await s.auth.getSession(token)).toBeNull();
    expect(s.mailer.sent.at(-1)?.subject).toMatch(/ændret/);
    expect(await s.auth.resetPassword({ token: t1, password: 'endnu-en-ny-kode-2026' })).toEqual({ ok: false, error: 'invalid_or_expired' });
    await s.auth.requestPasswordReset({ email: mail });
    const t2 = s.tokenOf(s.mailer.linkFrom());
    s.advance(31 * 60_000);
    expect(await s.auth.resetPassword({ token: t2, password: 'endnu-en-ny-kode-2026' })).toEqual({ ok: false, error: 'invalid_or_expired' });
  });
  it('et nyt link gør det gamle ugyldigt', async () => {
    const s = setup(); const { mail } = await verifiedUser(s);
    await s.auth.requestPasswordReset({ email: mail }); const old = s.tokenOf(s.mailer.linkFrom());
    s.advance(60_000);
    await s.auth.requestPasswordReset({ email: mail });
    expect(await s.auth.resetPassword({ token: old, password: 'en-ny-og-lang-kode-2026' })).toEqual({ ok: false, error: 'invalid_or_expired' });
  });
  it('to samtidige nulstillinger med samme link: kun én lykkes', async () => {
    const s = setup(); const { mail } = await verifiedUser(s);
    await s.auth.requestPasswordReset({ email: mail }); const t = s.tokenOf(s.mailer.linkFrom());
    const results = await Promise.all(['første-nye-kode-2026', 'anden-nye-kode-2026'].map((p) => s.auth.resetPassword({ token: t, password: p })));
    expect(results.filter((r) => r.ok)).toHaveLength(1);
  });
});

describe('step-up og skift af adgangskode', () => {
  it('genbekræftelse gælder i 10 minutter', async () => {
    const s = setup(); const { token } = await verifiedUser(s);
    expect(s.auth.isElevated((await s.auth.getSession(token))!)).toBe(false);
    expect(await s.auth.reauthenticate(token, 'forkert-forkert-forkert')).toEqual({ ok: false, error: 'invalid_credentials' });
    expect(await s.auth.reauthenticate(token, PW)).toEqual({ ok: true });
    expect(s.auth.isElevated((await s.auth.getSession(token))!)).toBe(true);
    s.advance(11 * 60_000);
    expect(s.auth.isElevated((await s.auth.getSession(token))!)).toBe(false);
  });
  it('skift kræver nuværende adgangskode, logger andre enheder ud og roterer sessionen', async () => {
    const s = setup(); const { mail, token } = await verifiedUser(s);
    const other = await s.auth.signIn({ email: mail, password: PW }); if (!other.ok) throw new Error();
    expect(await s.auth.changePassword(token, { currentPassword: 'gæt-gæt-gæt-gæt', newPassword: 'ny-lang-kode-2026!' })).toEqual({ ok: false, error: 'invalid_credentials' });
    const r = await s.auth.changePassword(token, { currentPassword: PW, newPassword: 'ny-lang-kode-2026!' });
    expect(r.ok).toBe(true); if (!r.ok) return;
    expect(await s.auth.getSession(token)).toBeNull();
    expect(await s.auth.getSession(other.session.token)).toBeNull();
    expect(await s.auth.getSession(r.session.token)).not.toBeNull();
  });
});

describe('rate limiting (delt, i Postgres)', () => {
  it('brute force mod én konto stoppes – også med rigtig adgangskode bagefter', async () => {
    const s = setup({ pgLimiter: true }); const { mail } = await verifiedUser(s);
    for (let i = 0; i < 9; i++) await s.auth.signIn({ email: mail, password: `gæt-nummer-${i}-xx` }, { ip: `203.0.113.${i}` });
    expect(await s.auth.signIn({ email: mail, password: 'gæt-nummer-x-xx' }, { ip: '203.0.113.99' })).toMatchObject({ ok: false });
    expect(await s.auth.signIn({ email: mail, password: PW }, { ip: '203.0.113.100' })).toEqual({ ok: false, error: 'rate_limited' });
    s.advance(15 * 60_000);
    expect((await s.auth.signIn({ email: mail, password: PW }, { ip: '203.0.113.100' })).ok).toBe(true);
  });
  it('masse-tilmelding fra én IP stoppes', async () => {
    const s = setup({ pgLimiter: true });
    const results = [];
    for (let i = 0; i < 7; i++) results.push(await s.auth.signUp({ email: email('bot'), password: PW, displayName: 'Bot' }, { ip: '198.51.100.7' }));
    expect(results.slice(0, 5).every((r) => r.ok)).toBe(true);
    expect(results.at(-1)).toEqual({ ok: false, error: 'rate_limited' });
  });
  it('atomisk ved samtidige forsøg: præcis kapaciteten slipper igennem', async () => {
    const limiter = new PgRateLimiter(db, { capacity: 5, refillPerSecond: 0.0001 });
    const results = await Promise.all(Array.from({ length: 20 }, () => limiter.consume('samtidig-test')));
    expect(results.filter((r) => r.allowed)).toHaveLength(5);
    const [row] = await db.select().from(schema.rateLimits).where(eq(schema.rateLimits.key, sha256Hex('samtidig-test')));
    expect(row).toBeDefined(); // nøglen gemmes som hash, ikke i klartekst
    expect(await db.select().from(schema.rateLimits).where(eq(schema.rateLimits.key, 'samtidig-test'))).toHaveLength(0);
  });
});

describe('audit', () => {
  it('logins og fejl logges uden adgangskoder og med maskeret e-mail', async () => {
    const s = setup(); const m = email('audit');
    await s.auth.signIn({ email: m, password: 'hemmelig-kode-123456' }, { ip: '203.0.113.50', userAgent: 'test' });
    const rows = await db.select().from(schema.auditLog).where(eq(schema.auditLog.ip, '203.0.113.50'));
    expect(rows[0]).toMatchObject({ action: 'auth.login.failed' });
    const dump = JSON.stringify(rows);
    expect(dump).not.toContain('hemmelig-kode');
    expect(dump).not.toContain(m);
  });
});
