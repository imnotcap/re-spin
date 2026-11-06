/**
 * To-trins-login med authenticator-app (TOTP) og engangs-gendannelseskoder.
 *  - Opsætning og fravalg kræver genbekræftelse (step-up) – en stjålen session kan ikke slå MFA fra.
 *  - Hemmeligheden krypteres (AES-256-GCM, bundet til bruger-id); gendannelseskoder gemmes kun som hash.
 *  - Ventende login: 5 min., maks. 5 forsøg pr. login, rate limit pr. bruger; samme kode kan ikke genbruges.
 */
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { and, eq, isNull, lt, sql, gt } from 'drizzle-orm';
import { schema } from '@respin/db';
import { sha256Hex } from './crypto';
import { open, seal } from './secretbox';
import { base32Encode, base32Decode, otpauthUri, verifyTotp } from './totp';
import { templates } from './mailer';
import type { Internals } from './internals';
import type { CurrentSession, IssuedSession, RequestContext } from './auth';

const { mfaTotp, mfaRecoveryCodes, mfaPending, users } = schema;
export const MFA_PENDING_TTL_MS = 5 * 60_000;
export const MFA_MAX_ATTEMPTS = 5;
export const RECOVERY_CODE_COUNT = 10;

/** 16 base32-tegn = 80 bits, vist som XXXX-XXXX-XXXX-XXXX */
const newRecoveryCode = () => base32Encode(randomBytes(10)).slice(0, 16).replace(/(.{4})(?=.)/g, '$1-');
const normalizeRecovery = (c: string) => c.toUpperCase().replace(/[^A-Z2-7]/g, '');

export function createMfa(i: Internals) {
  const { db, now } = i;
  const key = () => { if (!i.mfaKey) throw new Error('MFA er ikke konfigureret (mangler krypteringsnøgle)'); return i.mfaKey; };
  const notify = async (userId: string, what: string) => {
    const [u] = await db.select({ email: users.email }).from(users).where(eq(users.id, userId));
    if (u) await i.send(u.email, templates.securityChange(what, i.link('/forgot-password')));
  };

  async function issueRecoveryCodes(userId: string): Promise<string[]> {
    const codes = Array.from({ length: RECOVERY_CODE_COUNT }, newRecoveryCode);
    await db.delete(mfaRecoveryCodes).where(eq(mfaRecoveryCodes.userId, userId));
    await db.insert(mfaRecoveryCodes).values(codes.map((c) => ({ userId, codeHash: sha256Hex(normalizeRecovery(c)) })));
    return codes;
  }

  /** Accepterer en TOTP-kode (atomisk mod genafspilning) eller en ubrugt gendannelseskode. */
  async function checkSecondFactor(userId: string, rawCode: string): Promise<'totp' | 'recovery' | null> {
    const code = rawCode.replace(/\s/g, '');
    const [row] = await db.select().from(mfaTotp).where(eq(mfaTotp.userId, userId));
    if (!row?.enabledAt) return null;
    if (/^\d{6}$/.test(code)) {
      const secret = base32Decode(open(key(), row.secretEnc, userId));
      const r = verifyTotp(secret, code, now().getTime(), row.lastUsedStep);
      if (!r.ok) return null;
      // Kun én request kan "bruge" et tidstrin – også ved samtidige forsøg
      const claimed = await db.update(mfaTotp).set({ lastUsedStep: r.step }).where(and(eq(mfaTotp.userId, userId), lt(mfaTotp.lastUsedStep, r.step))).returning({ u: mfaTotp.userId });
      return claimed.length === 1 ? 'totp' : null;
    }
    const norm = normalizeRecovery(code);
    if (norm.length !== 16) return null;
    const used = await db.update(mfaRecoveryCodes).set({ usedAt: now() })
      .where(and(eq(mfaRecoveryCodes.userId, userId), eq(mfaRecoveryCodes.codeHash, sha256Hex(norm)), isNull(mfaRecoveryCodes.usedAt))).returning({ id: mfaRecoveryCodes.id });
    return used.length === 1 ? 'recovery' : null;
  }

  return {
    async status(userId: string): Promise<{ enabled: boolean; recoveryCodesLeft: number }> {
      const [row] = await db.select({ enabledAt: mfaTotp.enabledAt }).from(mfaTotp).where(eq(mfaTotp.userId, userId));
      const [c] = await db.select({ n: sql<number>`count(*)::int` }).from(mfaRecoveryCodes).where(and(eq(mfaRecoveryCodes.userId, userId), isNull(mfaRecoveryCodes.usedAt)));
      return { enabled: !!row?.enabledAt, recoveryCodesLeft: c?.n ?? 0 };
    },

    /** Trin 1: ny hemmelighed (vises som QR/tekst). Kræver step-up. */
    async beginTotpSetup(cur: CurrentSession): Promise<{ ok: true; secret: string; uri: string } | { ok: false; error: 'reauth_required' | 'already_enabled' }> {
      if (!i.isElevated(cur)) return { ok: false, error: 'reauth_required' };
      const [existing] = await db.select({ enabledAt: mfaTotp.enabledAt }).from(mfaTotp).where(eq(mfaTotp.userId, cur.user.id));
      if (existing?.enabledAt) return { ok: false, error: 'already_enabled' };
      const secret = base32Encode(randomBytes(20)); // 160 bit (RFC 4226-anbefaling)
      const secretEnc = seal(key(), secret, cur.user.id);
      await db.insert(mfaTotp).values({ userId: cur.user.id, secretEnc }).onConflictDoUpdate({ target: mfaTotp.userId, set: { secretEnc, lastUsedStep: 0 } });
      return { ok: true, secret, uri: otpauthUri(secret, cur.user.email) };
    },

    /** Trin 2: bekræft med en kode fra appen → slået til + gendannelseskoder (vises KUN nu). */
    async confirmTotpSetup(cur: CurrentSession, code: string, ctx: RequestContext = {}): Promise<{ ok: true; recoveryCodes: string[] } | { ok: false; error: 'reauth_required' | 'not_started' | 'invalid_code' }> {
      if (!i.isElevated(cur)) return { ok: false, error: 'reauth_required' };
      const [row] = await db.select().from(mfaTotp).where(eq(mfaTotp.userId, cur.user.id));
      if (!row || row.enabledAt) return { ok: false, error: 'not_started' };
      const r = verifyTotp(base32Decode(open(key(), row.secretEnc, cur.user.id)), code.replace(/\s/g, ''), now().getTime(), row.lastUsedStep);
      if (!r.ok) return { ok: false, error: 'invalid_code' };
      await db.update(mfaTotp).set({ enabledAt: now(), lastUsedStep: r.step }).where(eq(mfaTotp.userId, cur.user.id));
      const recoveryCodes = await issueRecoveryCodes(cur.user.id);
      await i.audit('auth.mfa.enabled', ctx, cur.user.id);
      await notify(cur.user.id, 'to-trins-login er slået til');
      return { ok: true, recoveryCodes };
    },

    /** Slå fra: kræver step-up OG en gyldig kode (en stjålen, nyligt genbekræftet session er ikke nok). */
    async disableTotp(cur: CurrentSession, code: string, ctx: RequestContext = {}): Promise<{ ok: true } | { ok: false; error: 'reauth_required' | 'invalid_code' }> {
      if (!i.isElevated(cur)) return { ok: false, error: 'reauth_required' };
      if (!(await checkSecondFactor(cur.user.id, code))) return { ok: false, error: 'invalid_code' };
      await db.delete(mfaRecoveryCodes).where(eq(mfaRecoveryCodes.userId, cur.user.id));
      await db.delete(mfaTotp).where(eq(mfaTotp.userId, cur.user.id));
      await i.audit('auth.mfa.disabled', ctx, cur.user.id);
      await notify(cur.user.id, 'to-trins-login er slået fra');
      return { ok: true };
    },

    async regenerateRecoveryCodes(cur: CurrentSession, ctx: RequestContext = {}): Promise<{ ok: true; recoveryCodes: string[] } | { ok: false; error: 'reauth_required' | 'not_enabled' }> {
      if (!i.isElevated(cur)) return { ok: false, error: 'reauth_required' };
      if (!(await this.status(cur.user.id)).enabled) return { ok: false, error: 'not_enabled' };
      const recoveryCodes = await issueRecoveryCodes(cur.user.id);
      await i.audit('auth.mfa.recovery_regenerated', ctx, cur.user.id);
      await notify(cur.user.id, 'nye gendannelseskoder er lavet (de gamle virker ikke længere)');
      return { ok: true, recoveryCodes };
    },

    /** Andet trin af login med adgangskode. */
    async verifyLogin(input: { mfaToken: string; code: string }, ctx: RequestContext = {}): Promise<{ ok: true; session: IssuedSession } | { ok: false; error: 'invalid_code' | 'expired' | 'too_many_attempts' | 'rate_limited' }> {
      if (!input.mfaToken || input.mfaToken.length > 100) return { ok: false, error: 'expired' };
      const tokenHash = sha256Hex(input.mfaToken);
      const [p] = await db.select().from(mfaPending).where(and(eq(mfaPending.tokenHash, tokenHash), isNull(mfaPending.usedAt), gt(mfaPending.expiresAt, now())));
      if (!p) return { ok: false, error: 'expired' };
      if (!(await i.limit('mfaUser', p.userId))) return { ok: false, error: 'rate_limited' };
      // Tæl forsøget FØR koden tjekkes (atomisk) – grænsen kan ikke omgås med samtidige requests
      const bumped = await db.update(mfaPending).set({ attempts: sql`${mfaPending.attempts} + 1` })
        .where(and(eq(mfaPending.tokenHash, tokenHash), lt(mfaPending.attempts, MFA_MAX_ATTEMPTS), isNull(mfaPending.usedAt))).returning({ attempts: mfaPending.attempts });
      if (bumped.length !== 1) { await i.audit('auth.mfa.locked', ctx, p.userId); return { ok: false, error: 'too_many_attempts' }; }
      const method = await checkSecondFactor(p.userId, input.code ?? '');
      if (!method) { await i.audit('auth.mfa.failed', ctx, p.userId); return { ok: false, error: bumped[0]!.attempts >= MFA_MAX_ATTEMPTS ? 'too_many_attempts' : 'invalid_code' }; }
      const done = await db.update(mfaPending).set({ usedAt: now() }).where(and(eq(mfaPending.tokenHash, tokenHash), isNull(mfaPending.usedAt))).returning({ u: mfaPending.userId });
      if (done.length !== 1) return { ok: false, error: 'expired' };
      await i.audit('auth.login', ctx, p.userId, { method: `password+${method}` });
      if (method === 'recovery') await notify(p.userId, 'der er logget ind med en gendannelseskode');
      return { ok: true, session: await i.createSession(p.userId, ctx, false, `password+${method}`) };
    }
  };
}

/** Konstant-tid sammenligning (eksporteret til tests) */
export const safeEqual = (a: string, b: string) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));
