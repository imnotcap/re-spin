/**
 * Passkeys (WebAuthn). Phishing-sikre: browseren binder signaturen til vores domæne (origin + RP ID),
 * og den private nøgle forlader aldrig brugerens enhed. Kræver brugerverifikation (Face ID/fingeraftryk/PIN),
 * så et passkey-login tæller som to faktorer.
 *  - Registrering kræver step-up. Challenges er engangs (5 min.) og bundet til formål og bruger.
 *  - Signaturtælleren tjekkes; falder den, afvises login (mulig klonet nøgle) og hændelsen logges.
 */
import { and, eq, gt, isNull } from 'drizzle-orm';
import {
  generateAuthenticationOptions, generateRegistrationOptions, verifyAuthenticationResponse, verifyRegistrationResponse,
  type AuthenticationResponseJSON, type PublicKeyCredentialCreationOptionsJSON, type PublicKeyCredentialRequestOptionsJSON, type RegistrationResponseJSON
} from '@simplewebauthn/server';
import { schema } from '@respin/db';
import { normalizeUserText } from '@respin/core';
import { templates } from './mailer';
import type { Internals } from './internals';
import type { CurrentSession, IssuedSession, RequestContext } from './auth';

const { webauthnCredentials, webauthnChallenges, users } = schema;
const CHALLENGE_TTL_MS = 5 * 60_000;
export const MAX_PASSKEYS = 10;

/** Udtræk challenge fra clientDataJSON uden at stole på resten (verificeres bagefter af biblioteket) */
function challengeOf(clientDataJSON: unknown): string | null {
  if (typeof clientDataJSON !== 'string' || clientDataJSON.length > 4096) return null;
  try {
    const c = JSON.parse(Buffer.from(clientDataJSON, 'base64url').toString('utf8')) as { challenge?: unknown };
    return typeof c.challenge === 'string' && c.challenge.length <= 200 ? c.challenge : null;
  } catch { return null; }
}

export function createPasskeys(i: Internals) {
  const { db, now } = i;
  const origin = new URL(i.appUrl).origin;
  const rpID = new URL(i.appUrl).hostname;

  async function storeChallenge(challenge: string, purpose: 'register' | 'login', userId: string | null) {
    await db.insert(webauthnChallenges).values({ challenge, purpose, userId, expiresAt: new Date(now().getTime() + CHALLENGE_TTL_MS) });
  }
  /** Forbruger en challenge præcis én gang */
  async function consumeChallenge(challenge: string | null, purpose: 'register' | 'login', userId: string | null): Promise<boolean> {
    if (!challenge) return false;
    const cond = and(eq(webauthnChallenges.challenge, challenge), eq(webauthnChallenges.purpose, purpose), isNull(webauthnChallenges.usedAt), gt(webauthnChallenges.expiresAt, now()),
      userId ? eq(webauthnChallenges.userId, userId) : isNull(webauthnChallenges.userId));
    const r = await db.update(webauthnChallenges).set({ usedAt: now() }).where(cond).returning({ id: webauthnChallenges.id });
    return r.length === 1;
  }
  const notify = async (email: string, what: string) => i.send(email, templates.securityChange(what, i.link('/glemt-adgangskode/')));

  return {
    async list(userId: string) {
      return db.select({ id: webauthnCredentials.id, name: webauthnCredentials.name, createdAt: webauthnCredentials.createdAt, lastUsedAt: webauthnCredentials.lastUsedAt, backedUp: webauthnCredentials.backedUp })
        .from(webauthnCredentials).where(eq(webauthnCredentials.userId, userId));
    },

    async registrationOptions(cur: CurrentSession): Promise<{ ok: true; options: PublicKeyCredentialCreationOptionsJSON } | { ok: false; error: 'reauth_required' | 'too_many' }> {
      if (!i.isElevated(cur)) return { ok: false, error: 'reauth_required' };
      const existing = await this.list(cur.user.id);
      if (existing.length >= MAX_PASSKEYS) return { ok: false, error: 'too_many' };
      const options = await generateRegistrationOptions({
        rpName: i.rpName, rpID, userName: cur.user.email, userDisplayName: cur.user.displayName,
        userID: new TextEncoder().encode(cur.user.id), attestationType: 'none', timeout: 60_000,
        excludeCredentials: existing.map((c) => ({ id: c.id })),
        authenticatorSelection: { residentKey: 'required', userVerification: 'required' }
      });
      await storeChallenge(options.challenge, 'register', cur.user.id);
      return { ok: true, options };
    },

    async verifyRegistration(cur: CurrentSession, response: RegistrationResponseJSON, name: string, ctx: RequestContext = {}): Promise<{ ok: true } | { ok: false; error: 'reauth_required' | 'invalid_passkey' }> {
      if (!i.isElevated(cur)) return { ok: false, error: 'reauth_required' };
      const challenge = challengeOf(response?.response?.clientDataJSON);
      if (!(await consumeChallenge(challenge, 'register', cur.user.id))) return { ok: false, error: 'invalid_passkey' };
      try {
        const v = await verifyRegistrationResponse({ response, expectedChallenge: challenge!, expectedOrigin: origin, expectedRPID: rpID, requireUserVerification: true });
        if (!v.verified) return { ok: false, error: 'invalid_passkey' };
        const { credential, credentialDeviceType, credentialBackedUp } = v.registrationInfo;
        const label = normalizeUserText(name || '').slice(0, 40) || 'Passkey';
        const inserted = await db.insert(webauthnCredentials).values({
          id: credential.id, userId: cur.user.id, publicKey: Buffer.from(credential.publicKey).toString('base64url'), counter: credential.counter,
          transports: credential.transports ?? [], deviceType: credentialDeviceType, backedUp: credentialBackedUp, name: label
        }).onConflictDoNothing().returning({ id: webauthnCredentials.id });
        if (inserted.length !== 1) return { ok: false, error: 'invalid_passkey' }; // samme nøgle findes allerede
        await i.audit('auth.passkey.added', ctx, cur.user.id, { name: label });
        await notify(cur.user.email, `en ny passkey ("${label}") er tilføjet`);
        return { ok: true };
      } catch {
        await i.audit('auth.passkey.register_failed', ctx, cur.user.id);
        return { ok: false, error: 'invalid_passkey' };
      }
    },

    /** Login uden brugernavn: browseren tilbyder brugerens passkeys til vores domæne. */
    async loginOptions(ctx: RequestContext = {}): Promise<{ ok: true; options: PublicKeyCredentialRequestOptionsJSON } | { ok: false; error: 'rate_limited' }> {
      if (!(await i.limit('passkeyIp', ctx.ip ?? 'unknown'))) return { ok: false, error: 'rate_limited' };
      const options = await generateAuthenticationOptions({ rpID, userVerification: 'required', timeout: 60_000 });
      await storeChallenge(options.challenge, 'login', null);
      return { ok: true, options };
    },

    async verifyLogin(response: AuthenticationResponseJSON, ctx: RequestContext = {}): Promise<{ ok: true; session: IssuedSession } | { ok: false; error: 'invalid_passkey' | 'rate_limited' }> {
      if (!(await i.limit('passkeyIp', ctx.ip ?? 'unknown'))) return { ok: false, error: 'rate_limited' };
      const challenge = challengeOf(response?.response?.clientDataJSON);
      if (!(await consumeChallenge(challenge, 'login', null))) return { ok: false, error: 'invalid_passkey' };
      if (typeof response?.id !== 'string' || response.id.length > 1024) return { ok: false, error: 'invalid_passkey' };
      const [row] = await db.select({ c: webauthnCredentials, status: users.status, verifiedAt: users.emailVerifiedAt })
        .from(webauthnCredentials).innerJoin(users, eq(users.id, webauthnCredentials.userId)).where(eq(webauthnCredentials.id, response.id));
      if (!row || row.status !== 'active' || !row.verifiedAt) return { ok: false, error: 'invalid_passkey' };
      // userHandle (hvis sendt) skal pege på samme bruger som nøglen
      if (response.response.userHandle && Buffer.from(response.response.userHandle, 'base64url').toString('utf8') !== row.c.userId) return { ok: false, error: 'invalid_passkey' };
      try {
        const v = await verifyAuthenticationResponse({
          response, expectedChallenge: challenge!, expectedOrigin: origin, expectedRPID: rpID, requireUserVerification: true,
          credential: { id: row.c.id, publicKey: new Uint8Array(Buffer.from(row.c.publicKey, 'base64url')), counter: row.c.counter, transports: row.c.transports as never }
        });
        if (!v.verified) throw new Error('not verified');
        const updated = await db.update(webauthnCredentials).set({ counter: v.authenticationInfo.newCounter, lastUsedAt: now() })
          .where(and(eq(webauthnCredentials.id, row.c.id), eq(webauthnCredentials.counter, row.c.counter))).returning({ id: webauthnCredentials.id });
        if (updated.length !== 1) throw new Error('samtidig brug');
        await i.audit('auth.login', ctx, row.c.userId, { method: 'passkey' });
        return { ok: true, session: await i.createSession(row.c.userId, ctx, false, 'passkey') };
      } catch (e) {
        await i.audit(/counter/i.test(String(e)) ? 'auth.passkey.counter_regression' : 'auth.passkey.failed', ctx, row.c.userId);
        return { ok: false, error: 'invalid_passkey' };
      }
    },

    async remove(cur: CurrentSession, credentialId: string, ctx: RequestContext = {}): Promise<{ ok: true } | { ok: false; error: 'reauth_required' | 'not_found' }> {
      if (!i.isElevated(cur)) return { ok: false, error: 'reauth_required' };
      const r = await db.delete(webauthnCredentials).where(and(eq(webauthnCredentials.id, credentialId), eq(webauthnCredentials.userId, cur.user.id))).returning({ name: webauthnCredentials.name });
      if (r.length !== 1) return { ok: false, error: 'not_found' };
      await i.audit('auth.passkey.removed', ctx, cur.user.id, { name: r[0]!.name });
      await notify(cur.user.email, `passkey'en "${r[0]!.name}" er fjernet`);
      return { ok: true };
    }
  };
}
