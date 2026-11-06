import 'server-only';
import { createAccessVerifier, createAdminGuard } from '@respin/security';
import { adminEnv } from './env';

let guard: ReturnType<typeof createAdminGuard> | undefined;

/** Samme vagt bruges i proxy.ts og i requireStaff(): host → IP → Cloudflare Access-identitet. */
export function getGuard() {
  if (guard) return guard;
  const e = adminEnv();
  const isProd = e.NODE_ENV === 'production';
  const verifyAccess = e.ACCESS_TEAM_DOMAIN && e.ACCESS_AUD
    ? createAccessVerifier({ teamDomain: e.ACCESS_TEAM_DOMAIN, audience: e.ACCESS_AUD })
    : async () => { throw new Error('Access er ikke konfigureret'); };
  guard = createAdminGuard({
    isProd,
    allowedHosts: e.ADMIN_ALLOWED_HOSTS,
    ipAllowlist: e.ADMIN_IP_ALLOWLIST,
    ipAllowlistDisabled: e.ADMIN_IP_ALLOWLIST_DISABLED,
    ipHeader: e.ADMIN_IP_HEADER,
    trustedProxies: e.ADMIN_TRUSTED_PROXIES,
    verifyAccess,
    devIdentity: !isProd && e.ADMIN_DEV_EMAIL ? { email: e.ADMIN_DEV_EMAIL.toLowerCase(), subject: 'dev' } : null
  });
  return guard;
}
