/**
 * re:spin login. Sikkerhedsegenskaber (alle testet i auth.test.ts):
 *  - Ingen brugerenumerering: tilmelding og "glemt adgangskode" svarer altid ens; ukendt e-mail ved login
 *    bruger samme tid (dummy-hash) og samme fejl som forkert adgangskode.
 *  - Ingen account pre-hijacking: en konto aktiveres kun med bekræftelseslink OG den aktuelle adgangskode
 *    (eller via nulstilling, som beviser kontrol over indbakken og sætter en ny adgangskode).
 *  - Sessioner: 256-bit tokens, kun SHA-256 gemmes, absolut og inaktiv udløb, ny token ved hvert login,
 *    alle sessioner tilbagekaldes ved ny adgangskode.
 *  - Engangslinks: kun hash gemmes, kort levetid, kan bruges én gang, ældre links ugyldiggøres.
 *  - Rate limiting pr. IP og pr. konto. Følsomme handlinger kræver genbekræftelse (step-up).
 *  - Alle links bygges ud fra konfigureret APP_URL – aldrig fra Host-headeren (forhindrer forgiftede nulstillingslinks).
 */
import { and, eq, gt, isNull, ne } from 'drizzle-orm';
import { z } from 'zod';
import { schema, type Db } from '@respin/db';
import { normalizeUserText } from '@respin/core';
import { createAuditor, maskEmail, type BucketConfig, type RateLimiter } from '@respin/security';
import { randomToken, sha256Hex } from './crypto';
import { argon2Hasher, checkPasswordPolicy, PASSWORD_MAX, type PasswordHasher, type PasswordProblem, type PwnedChecker } from './password';
import { templates, type Mailer } from './mailer';
import { parseKey } from './secretbox';
import { createMfa, MFA_PENDING_TTL_MS } from './mfa';
import { createPasskeys } from './passkeys';
import type { Internals } from './internals';

const { users, userPasswords, sessions, authTokens, auditLog, mfaTotp, mfaPending } = schema;

export const SESSION_TTL_MS = 30 * 24 * 3_600_000;   // absolut levetid
export const SESSION_IDLE_MS = 7 * 24 * 3_600_000;   // udløber efter 7 dages inaktivitet
const SESSION_TOUCH_MS = 15 * 60_000;                // opdatér last_seen højst hvert 15. min.
export const STEP_UP_MS = 10 * 60_000;               // genbekræftelse gælder i 10 min.
const VERIFY_TTL_MS = 24 * 3_600_000;
const RESET_TTL_MS = 30 * 60_000;

/** Grænser (pr. IP er løsere end pr. konto, så delte IP'er – mobilnet, kontorer – ikke rammes unødigt) */
export const AUTH_LIMITS = {
  signupIp: { capacity: 5, refillPerSecond: 5 / 3600 },
  loginIp: { capacity: 30, refillPerSecond: 30 / 900 },
  loginAccount: { capacity: 10, refillPerSecond: 10 / 900 },
  verifyIp: { capacity: 10, refillPerSecond: 10 / 900 },
  resetIp: { capacity: 5, refillPerSecond: 5 / 3600 },
  resetAccount: { capacity: 3, refillPerSecond: 3 / 3600 },
  reauth: { capacity: 5, refillPerSecond: 5 / 900 },
  mfaUser: { capacity: 10, refillPerSecond: 10 / 900 },
  passkeyIp: { capacity: 30, refillPerSecond: 30 / 900 }
} as const satisfies Record<string, BucketConfig>;
export type LimitName = keyof typeof AUTH_LIMITS;

export const normalizeEmail = (email: string): string => email.normalize('NFC').trim().toLowerCase();
const emailSchema = z.string().max(254).transform(normalizeEmail).pipe(z.email());
const passwordInput = z.string().min(1).max(PASSWORD_MAX * 4);

export interface AuthDeps {
  db: Db;
  mailer: Mailer;
  /** Fabrik der giver en limiter pr. konfiguration (PgRateLimiter i produktion) */
  limiter: (cfg: BucketConfig) => RateLimiter;
  /** fx https://respin.dk – bruges til alle links i e-mails */
  appUrl: string;
  pwned?: PwnedChecker;
  hasher?: PasswordHasher;
  now?: () => Date;
  onError?: (e: unknown) => void;
  /** 32-byte nøgle (base64) til kryptering af TOTP-hemmeligheder. Uden den kan MFA ikke slås til. */
  mfaKey?: string;
  /** Navn vist i passkey-dialogen */
  rpName?: string;
}

export interface RequestContext { ip?: string | null; userAgent?: string | null }
export interface IssuedSession { token: string; expiresAt: Date }
export interface CurrentSession {
  session: { id: string; expiresAt: Date; elevatedUntil: Date | null; createdAt: Date };
  user: { id: string; email: string; displayName: string };
}

export type SignUpError = 'invalid_input' | 'rate_limited' | 'breached_password' | PasswordProblem;
export type SignInError = 'invalid_credentials' | 'email_not_verified' | 'account_disabled' | 'rate_limited' | 'invalid_input' | 'mfa_required';

export function createAuth(deps: AuthDeps) {
  const hasher = deps.hasher ?? argon2Hasher;
  const now = deps.now ?? (() => new Date());
  const db = deps.db;
  const appUrl = new URL(deps.appUrl).origin;
  const link = (path: string, token?: string) => `${appUrl}${path}${token ? `?token=${encodeURIComponent(token)}` : ''}`;
  const limiters = new Map<LimitName, RateLimiter>();
  const limit = async (name: LimitName, key: string) => {
    let l = limiters.get(name);
    if (!l) { l = deps.limiter(AUTH_LIMITS[name]); limiters.set(name, l); }
    return (await l.consume(`${name}:${key}`)).allowed;
  };
  const auditor = createAuditor({ write: async (e) => { await db.insert(auditLog).values({ ...e, metadata: e.metadata ?? {} }); } }, deps.onError);
  const audit = (action: string, ctx: RequestContext, actorId: string | null, metadata: Record<string, unknown> = {}) =>
    auditor.record({ actorType: actorId ? 'user' : 'system', actorId, action, ip: ctx.ip ?? null, userAgent: ctx.userAgent ?? null, metadata });
  const send = async (to: string, mail: { subject: string; text: string }) => {
    try { await deps.mailer.send({ to, ...mail }); } catch (e) { deps.onError?.(e); }
  };

  let dummyHash: Promise<string> | undefined;
  const dummy = () => (dummyHash ??= hasher.hash(randomToken()));

  async function passwordProblem(password: string, email: string): Promise<SignUpError | null> {
    const p = checkPasswordPolicy(password, { email });
    if (p) return p;
    if (deps.pwned && ((await deps.pwned(password)) ?? 0) > 0) return 'breached_password';
    return null;
  }

  async function issueToken(tx: Db | Parameters<Parameters<Db['transaction']>[0]>[0], userId: string, purpose: 'verify_email' | 'reset_password', ttl: number): Promise<string> {
    // Ældre, ubrugte links af samme type gøres ugyldige
    await tx.update(authTokens).set({ usedAt: now() }).where(and(eq(authTokens.userId, userId), eq(authTokens.purpose, purpose), isNull(authTokens.usedAt)));
    const token = randomToken();
    await tx.insert(authTokens).values({ tokenHash: sha256Hex(token), userId, purpose, expiresAt: new Date(now().getTime() + ttl) });
    return token;
  }

  async function consumeToken(token: string, purpose: 'verify_email' | 'reset_password') {
    if (!token || token.length > 100) return null;
    const [row] = await db.select().from(authTokens).where(and(eq(authTokens.tokenHash, sha256Hex(token)), eq(authTokens.purpose, purpose), isNull(authTokens.usedAt), gt(authTokens.expiresAt, now())));
    return row ?? null;
  }

  async function createSession(userId: string, ctx: RequestContext, elevated = false, method = 'password'): Promise<IssuedSession> {
    const token = randomToken();
    const t = now();
    const expiresAt = new Date(t.getTime() + SESSION_TTL_MS);
    await db.insert(sessions).values({ tokenHash: sha256Hex(token), userId, expiresAt, lastSeenAt: t, createdAt: t, elevatedUntil: elevated ? new Date(t.getTime() + STEP_UP_MS) : null, authMethod: method, ip: ctx.ip ?? null, userAgent: ctx.userAgent?.slice(0, 256) ?? null });
    return { token, expiresAt };
  }

  async function findUserWithPassword(email: string) {
    const [row] = await db.select({ id: users.id, email: users.email, status: users.status, verifiedAt: users.emailVerifiedAt, hash: userPasswords.hash })
      .from(users).leftJoin(userPasswords, eq(userPasswords.userId, users.id)).where(eq(users.emailNormalized, email));
    return row ?? null;
  }

  const core = {
    /** Svarer { ok: true } både for ny og eksisterende e-mail (ingen enumerering). */
    async signUp(input: { email: string; password: string; displayName: string }, ctx: RequestContext = {}): Promise<{ ok: true } | { ok: false; error: SignUpError }> {
      const parsed = z.object({ email: emailSchema, password: passwordInput, displayName: z.string().max(200).transform(normalizeUserText).pipe(z.string().min(2).max(40)) }).safeParse(input);
      if (!parsed.success) return { ok: false, error: 'invalid_input' };
      const { email, password, displayName } = parsed.data;
      if (!(await limit('signupIp', ctx.ip ?? 'unknown'))) return { ok: false, error: 'rate_limited' };
      const problem = await passwordProblem(password, email);
      if (problem) return { ok: false, error: problem };
      const hash = await hasher.hash(password);

      const existing = await findUserWithPassword(email);
      if (existing?.verifiedAt) {
        await send(existing.email, templates.alreadyRegistered(link('/log-ind/'), link('/glemt-adgangskode/')));
        await audit('auth.signup.existing', ctx, null, { email: maskEmail(email) });
        return { ok: true };
      }
      let userId: string;
      if (existing) {
        // Ubekræftet konto: seneste tilmelding vinder. Aktivering kræver link + DENNE adgangskode (forhindrer pre-hijacking).
        userId = existing.id;
        await db.insert(userPasswords).values({ userId, hash }).onConflictDoUpdate({ target: userPasswords.userId, set: { hash, updatedAt: now() } });
        await db.update(users).set({ displayName }).where(eq(users.id, userId));
      } else {
        try {
          const [u] = await db.insert(users).values({ email: input.email.trim().slice(0, 254), emailNormalized: email, displayName }).returning({ id: users.id });
          userId = u!.id;
          await db.insert(userPasswords).values({ userId, hash });
        } catch {
          return { ok: true }; // samtidig tilmelding med samme e-mail: samme svar
        }
      }
      const token = await issueToken(db, userId, 'verify_email', VERIFY_TTL_MS);
      await send(email, templates.verify(link('/bekraeft-email/', token)));
      await audit('auth.signup', ctx, userId);
      return { ok: true };
    },

    /** Aktivér konto: kræver gyldigt link OG den aktuelle adgangskode. Logger ind ved succes. */
    async verifyEmail(input: { token: string; password: string }, ctx: RequestContext = {}): Promise<{ ok: true; session: IssuedSession } | { ok: false; error: 'invalid_or_expired' | 'invalid_credentials' | 'rate_limited' }> {
      if (!(await limit('verifyIp', ctx.ip ?? 'unknown'))) return { ok: false, error: 'rate_limited' };
      const row = await consumeToken(input.token, 'verify_email');
      if (!row) return { ok: false, error: 'invalid_or_expired' };
      const [pw] = await db.select({ hash: userPasswords.hash }).from(userPasswords).where(eq(userPasswords.userId, row.userId));
      if (!pw || !(await hasher.verify(pw.hash, input.password ?? ''))) {
        await audit('auth.verify.wrong_password', ctx, row.userId);
        return { ok: false, error: 'invalid_credentials' };
      }
      const used = await db.update(authTokens).set({ usedAt: now() }).where(and(eq(authTokens.tokenHash, row.tokenHash), isNull(authTokens.usedAt))).returning({ h: authTokens.tokenHash });
      if (used.length !== 1) return { ok: false, error: 'invalid_or_expired' }; // brugt samtidigt af en anden request
      await db.update(users).set({ emailVerifiedAt: now() }).where(and(eq(users.id, row.userId), isNull(users.emailVerifiedAt)));
      await audit('auth.email_verified', ctx, row.userId);
      return { ok: true, session: await createSession(row.userId, ctx) };
    },

    async signIn(input: { email: string; password: string }, ctx: RequestContext = {}): Promise<{ ok: true; session: IssuedSession } | { ok: false; error: SignInError; mfaToken?: string }> {
      const parsed = z.object({ email: emailSchema, password: passwordInput }).safeParse(input);
      if (!parsed.success) return { ok: false, error: 'invalid_credentials' };
      const { email, password } = parsed.data;
      const ipOk = await limit('loginIp', ctx.ip ?? 'unknown');
      const acctOk = await limit('loginAccount', email);
      if (!ipOk || !acctOk) { await audit('auth.login.rate_limited', ctx, null, { email: maskEmail(email) }); return { ok: false, error: 'rate_limited' }; }

      const user = await findUserWithPassword(email);
      // Ukendt e-mail: verificér mod en dummy-hash, så svartiden ikke afslører om kontoen findes
      const valid = user?.hash ? await hasher.verify(user.hash, password) : (await hasher.verify(await dummy(), password), false);
      if (!user || !valid) { await audit('auth.login.failed', ctx, user?.id ?? null, { email: maskEmail(email) }); return { ok: false, error: 'invalid_credentials' }; }
      if (user.status !== 'active') { await audit('auth.login.disabled', ctx, user.id); return { ok: false, error: 'account_disabled' }; }
      if (!user.verifiedAt) {
        const token = await issueToken(db, user.id, 'verify_email', VERIFY_TTL_MS);
        await send(user.email, templates.verify(link('/bekraeft-email/', token)));
        return { ok: false, error: 'email_not_verified' };
      }
      if (hasher.needsRehash(user.hash!)) await db.update(userPasswords).set({ hash: await hasher.hash(password), updatedAt: now() }).where(eq(userPasswords.userId, user.id));
      // To-trins-login: adgangskoden er godkendt, men der oprettes INGEN session før anden faktor er verificeret
      const [totp] = await db.select({ enabledAt: mfaTotp.enabledAt }).from(mfaTotp).where(eq(mfaTotp.userId, user.id));
      if (totp?.enabledAt) {
        const mfaToken = randomToken();
        await db.insert(mfaPending).values({ tokenHash: sha256Hex(mfaToken), userId: user.id, expiresAt: new Date(now().getTime() + MFA_PENDING_TTL_MS) });
        await audit('auth.login.mfa_required', ctx, user.id);
        return { ok: false, error: 'mfa_required', mfaToken };
      }
      await audit('auth.login', ctx, user.id);
      return { ok: true, session: await createSession(user.id, ctx) };
    },

    /** Validerer en session. Null = ikke logget ind (udløbet, tilbagekaldt, inaktiv, spærret konto). */
    async getSession(token: string | null | undefined): Promise<CurrentSession | null> {
      if (!token || token.length > 100) return null;
      const t = now();
      const [row] = await db.select({ s: sessions, u: { id: users.id, email: users.email, displayName: users.displayName, status: users.status, verifiedAt: users.emailVerifiedAt } })
        .from(sessions).innerJoin(users, eq(users.id, sessions.userId)).where(eq(sessions.tokenHash, sha256Hex(token)));
      if (!row) return null;
      const { s, u } = row;
      if (s.revokedAt || s.expiresAt <= t || t.getTime() - s.lastSeenAt.getTime() > SESSION_IDLE_MS || u.status !== 'active' || !u.verifiedAt) return null;
      if (t.getTime() - s.lastSeenAt.getTime() > SESSION_TOUCH_MS) await db.update(sessions).set({ lastSeenAt: t }).where(eq(sessions.id, s.id));
      return { session: { id: s.id, expiresAt: s.expiresAt, elevatedUntil: s.elevatedUntil, createdAt: s.createdAt }, user: { id: u.id, email: u.email, displayName: u.displayName } };
    },

    /** Har brugeren genbekræftet inden for de sidste 10 min.? Påkrævet før ændring af e-mail, udbetalingskonto osv. */
    isElevated(current: CurrentSession): boolean {
      return !!current.session.elevatedUntil && current.session.elevatedUntil > now();
    },

    async reauthenticate(token: string, password: string, ctx: RequestContext = {}): Promise<{ ok: true } | { ok: false; error: 'invalid_credentials' | 'rate_limited' | 'no_session' }> {
      const cur = await this.getSession(token);
      if (!cur) return { ok: false, error: 'no_session' };
      if (!(await limit('reauth', cur.session.id))) return { ok: false, error: 'rate_limited' };
      const [pw] = await db.select({ hash: userPasswords.hash }).from(userPasswords).where(eq(userPasswords.userId, cur.user.id));
      if (!pw || !(await hasher.verify(pw.hash, password))) { await audit('auth.reauth.failed', ctx, cur.user.id); return { ok: false, error: 'invalid_credentials' }; }
      await db.update(sessions).set({ elevatedUntil: new Date(now().getTime() + STEP_UP_MS) }).where(eq(sessions.id, cur.session.id));
      await audit('auth.reauth', ctx, cur.user.id);
      return { ok: true };
    },

    async signOut(token: string | null | undefined, ctx: RequestContext = {}): Promise<void> {
      if (!token) return;
      const [s] = await db.update(sessions).set({ revokedAt: now() }).where(and(eq(sessions.tokenHash, sha256Hex(token)), isNull(sessions.revokedAt))).returning({ userId: sessions.userId });
      if (s) await audit('auth.logout', ctx, s.userId);
    },

    /** Log ud på alle (andre) enheder */
    async signOutEverywhere(userId: string, exceptSessionId?: string, ctx: RequestContext = {}): Promise<void> {
      const cond = exceptSessionId ? and(eq(sessions.userId, userId), isNull(sessions.revokedAt), ne(sessions.id, exceptSessionId)) : and(eq(sessions.userId, userId), isNull(sessions.revokedAt));
      await db.update(sessions).set({ revokedAt: now() }).where(cond);
      await audit('auth.logout_everywhere', ctx, userId);
    },

    async listSessions(userId: string) {
      return db.select({ id: sessions.id, createdAt: sessions.createdAt, lastSeenAt: sessions.lastSeenAt, ip: sessions.ip, userAgent: sessions.userAgent })
        .from(sessions).where(and(eq(sessions.userId, userId), isNull(sessions.revokedAt), gt(sessions.expiresAt, now())));
    },

    /** Tilbagekald én session – kun brugerens egne (ellers sker der ingenting) */
    async revokeSession(userId: string, sessionId: string): Promise<boolean> {
      const r = await db.update(sessions).set({ revokedAt: now() }).where(and(eq(sessions.id, sessionId), eq(sessions.userId, userId), isNull(sessions.revokedAt))).returning({ id: sessions.id });
      return r.length === 1;
    },

    /** Svarer altid { ok: true } (ingen enumerering); sender kun mail hvis kontoen findes og grænserne tillader det. */
    async requestPasswordReset(input: { email: string }, ctx: RequestContext = {}): Promise<{ ok: true }> {
      const parsed = emailSchema.safeParse(input.email);
      if (!parsed.success) return { ok: true };
      const email = parsed.data;
      if (!(await limit('resetIp', ctx.ip ?? 'unknown')) || !(await limit('resetAccount', email))) return { ok: true };
      const [u] = await db.select({ id: users.id, email: users.email, status: users.status }).from(users).where(eq(users.emailNormalized, email));
      if (u && u.status === 'active') {
        const token = await issueToken(db, u.id, 'reset_password', RESET_TTL_MS);
        await send(u.email, templates.reset(link('/ny-adgangskode/', token)));
        await audit('auth.reset.requested', ctx, u.id);
      }
      return { ok: true };
    },

    /** Ny adgangskode via link. Bekræfter også e-mailen (indbakken er bevist) og logger ud overalt. */
    async resetPassword(input: { token: string; password: string }, ctx: RequestContext = {}): Promise<{ ok: true } | { ok: false; error: 'invalid_or_expired' | SignUpError }> {
      const row = await consumeToken(input.token, 'reset_password');
      if (!row) return { ok: false, error: 'invalid_or_expired' };
      const [u] = await db.select({ email: users.email, status: users.status }).from(users).where(eq(users.id, row.userId));
      if (!u || u.status !== 'active') return { ok: false, error: 'invalid_or_expired' };
      const problem = await passwordProblem(input.password ?? '', normalizeEmail(u.email));
      if (problem) return { ok: false, error: problem };
      const hash = await hasher.hash(input.password);
      const done = await db.transaction(async (tx) => {
        const used = await tx.update(authTokens).set({ usedAt: now() }).where(and(eq(authTokens.tokenHash, row.tokenHash), isNull(authTokens.usedAt))).returning({ h: authTokens.tokenHash });
        if (used.length !== 1) return false;
        await tx.insert(userPasswords).values({ userId: row.userId, hash }).onConflictDoUpdate({ target: userPasswords.userId, set: { hash, updatedAt: now() } });
        await tx.update(users).set({ emailVerifiedAt: now() }).where(and(eq(users.id, row.userId), isNull(users.emailVerifiedAt)));
        await tx.update(sessions).set({ revokedAt: now() }).where(and(eq(sessions.userId, row.userId), isNull(sessions.revokedAt)));
        await tx.update(authTokens).set({ usedAt: now() }).where(and(eq(authTokens.userId, row.userId), isNull(authTokens.usedAt)));
        return true;
      });
      if (!done) return { ok: false, error: 'invalid_or_expired' };
      await send(u.email, templates.passwordChanged(link('/glemt-adgangskode/')));
      await audit('auth.reset.completed', ctx, row.userId);
      return { ok: true };
    },

    /** Skift adgangskode (logget ind): kræver nuværende adgangskode, logger andre enheder ud og roterer denne session. */
    async changePassword(token: string, input: { currentPassword: string; newPassword: string }, ctx: RequestContext = {}): Promise<{ ok: true; session: IssuedSession } | { ok: false; error: 'no_session' | 'invalid_credentials' | 'rate_limited' | SignUpError }> {
      const cur = await this.getSession(token);
      if (!cur) return { ok: false, error: 'no_session' };
      if (!(await limit('reauth', cur.session.id))) return { ok: false, error: 'rate_limited' };
      const [pw] = await db.select({ hash: userPasswords.hash }).from(userPasswords).where(eq(userPasswords.userId, cur.user.id));
      if (!pw || !(await hasher.verify(pw.hash, input.currentPassword))) return { ok: false, error: 'invalid_credentials' };
      const problem = await passwordProblem(input.newPassword, normalizeEmail(cur.user.email));
      if (problem) return { ok: false, error: problem };
      await db.update(userPasswords).set({ hash: await hasher.hash(input.newPassword), updatedAt: now() }).where(eq(userPasswords.userId, cur.user.id));
      await db.update(sessions).set({ revokedAt: now() }).where(and(eq(sessions.userId, cur.user.id), isNull(sessions.revokedAt)));
      await send(cur.user.email, templates.passwordChanged(link('/glemt-adgangskode/')));
      await audit('auth.password_changed', ctx, cur.user.id);
      return { ok: true, session: await createSession(cur.user.id, ctx, true) };
    }
  };

  const internals: Internals = {
    db, now, appUrl, link, limit, audit, send, createSession, hasher,
    isElevated: (cur) => core.isElevated(cur),
    mfaKey: deps.mfaKey ? parseKey(deps.mfaKey) : null,
    rpName: deps.rpName ?? 're:spin'
  };
  return Object.assign(core, { mfa: createMfa(internals), passkeys: createPasskeys(internals) });
}

export type Auth = ReturnType<typeof createAuth>;
