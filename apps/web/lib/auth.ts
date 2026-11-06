import 'server-only';
import { cache } from 'react';
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { ConsoleMailer, PgRateLimiter, createAuth, createPwnedChecker, sessionCookieName, sessionCookieOptions, type Auth, type IssuedSession, type RequestContext } from '@respin/auth';
import { getClientIp, loadEnv, safeRedirectPath } from '@respin/security';
import { getDb } from './server';

export const isProd = process.env.NODE_ENV === 'production';

const envSchema = z.object({
  /** Kanonisk adresse til links i e-mails. ALDRIG udledt af Host-headeren (forgiftede nulstillingslinks). */
  APP_URL: z.url(),
  MAIL_TRANSPORT: z.enum(['console']).default('console'),
  PWNED_CHECK: z.enum(['on', 'off']).default('on'),
  /** Header som den betroede proxy sætter med klientens IP */
  TRUSTED_IP_HEADER: z.enum(['cf-connecting-ip', 'x-real-ip', 'x-forwarded-for']).default('x-forwarded-for'),
  TRUSTED_PROXIES: z.coerce.number().int().min(1).max(5).default(1)
}).superRefine((e, ctx) => {
  if (!isProd) return;
  if (!e.APP_URL.startsWith('https://')) ctx.addIssue({ code: 'custom', path: ['APP_URL'], message: 'skal være https i produktion' });
  if (e.MAIL_TRANSPORT === 'console') ctx.addIssue({ code: 'custom', path: ['MAIL_TRANSPORT'], message: 'konsol-mail er ikke tilladt i produktion – konfigurér en mailudbyder' });
});

type Env = z.infer<typeof envSchema>;
const g = globalThis as unknown as { __respinAuth?: { auth: Auth; env: Env } };

function boot() {
  if (!g.__respinAuth) {
    const env = loadEnv(envSchema);
    const db = getDb();
    const auth = createAuth({
      db,
      appUrl: env.APP_URL,
      mailer: new ConsoleMailer(),
      limiter: (cfg) => new PgRateLimiter(db, cfg),
      pwned: env.PWNED_CHECK === 'on' ? createPwnedChecker() : undefined,
      onError: (e) => console.error('auth-fejl', e instanceof Error ? e.message : 'ukendt')
    });
    g.__respinAuth = { auth, env };
  }
  return g.__respinAuth;
}
export const getAuth = (): Auth => boot().auth;

export async function requestContext(): Promise<RequestContext> {
  const h = await headers();
  const { env } = boot();
  return { ip: getClientIp(h, { header: env.TRUSTED_IP_HEADER, trustedProxies: env.TRUSTED_PROXIES }), userAgent: h.get('user-agent') };
}

const COOKIE = sessionCookieName(isProd);

export async function setSessionCookie(session: IssuedSession): Promise<void> {
  (await cookies()).set(COOKIE, session.token, sessionCookieOptions(isProd, session.expiresAt));
}
export async function clearSessionCookie(): Promise<void> {
  (await cookies()).set(COOKIE, '', { ...sessionCookieOptions(isProd, new Date(0)), maxAge: 0 });
}
export async function sessionToken(): Promise<string | undefined> {
  return (await cookies()).get(COOKIE)?.value;
}

/** Den indloggede bruger (eller null). Cachet pr. request. */
export const getCurrentSession = cache(async () => getAuth().getSession(await sessionToken()));

/** Kræv login; ellers til /login med sikker retur-sti. */
export async function requireSession(returnTo: string) {
  const current = await getCurrentSession();
  if (!current) redirect(`/login?next=${encodeURIComponent(safeRedirectPath(returnTo))}`);
  return current;
}
