/**
 * Adgangskontrol til admin-subdomænet. Rækkefølge: host → IP → identitet. Fejler LUKKET.
 *
 * Kør den på TO steder: i proxy.ts (tidlig afvisning) OG i hver side/route handler (`requireStaff`).
 * Man må aldrig stole på, at proxy/middleware altid har kørt – tidligere Next.js-sårbarheder
 * (CVE-2025-29927) lod angribere springe den over. Derfor bruges ingen "x-staff-*"-header sat af proxyen.
 */
import { getClientIp, isIpAllowed, type ClientIpOptions } from './ip';
import type { StaffIdentity } from './access-jwt';

export interface AdminGuardConfig {
  isProd: boolean;
  /** Tilladte Host-headers, fx ['admin.videro.dk'] (i dev tilføjes localhost automatisk) */
  allowedHosts: string[];
  /** CIDR-liste. Tom liste i produktion = nægt alle, medmindre `ipAllowlistDisabled` er sat bevidst. */
  ipAllowlist: string[];
  /** Kun hvis Cloudflare Access (eller tilsvarende) allerede håndhæver IP-regler foran appen */
  ipAllowlistDisabled?: boolean;
  ipHeader: ClientIpOptions['header'];
  trustedProxies?: number;
  /** Verificerer Access-JWT (createAccessVerifier) */
  verifyAccess: (token: string | null | undefined) => Promise<StaffIdentity>;
  /** KUN udvikling: spring Access over og brug denne identitet. Afvises i produktion. */
  devIdentity?: StaffIdentity | null;
}

export type GuardResult =
  | { ok: true; identity: StaffIdentity; ip: string | null }
  | { ok: false; status: 401 | 403 | 404; reason: 'host' | 'ip' | 'unauthenticated' };

export function createAdminGuard(cfg: AdminGuardConfig): (headers: Headers) => Promise<GuardResult> {
  if (cfg.isProd && cfg.devIdentity) throw new Error('devIdentity må ikke bruges i produktion');
  if (cfg.isProd && cfg.allowedHosts.length === 0) throw new Error('ADMIN_ALLOWED_HOSTS skal være sat i produktion');
  if (cfg.isProd && !cfg.ipAllowlistDisabled && cfg.ipAllowlist.length === 0) {
    throw new Error('ADMIN_IP_ALLOWLIST er tom. Sæt en allowlist, eller sæt ADMIN_IP_ALLOWLIST_DISABLED=true hvis Cloudflare Access håndhæver IP-regler.');
  }
  isIpAllowed('127.0.0.1', cfg.ipAllowlist); // validerer CIDR-syntaks ved opstart (kaster ved slåfejl)

  const hosts = new Set([...cfg.allowedHosts.map((h) => h.toLowerCase()), ...(cfg.isProd ? [] : ['localhost', '127.0.0.1'])]);
  const ipEnforced = !cfg.ipAllowlistDisabled && (cfg.isProd || cfg.ipAllowlist.length > 0);

  return async (headers) => {
    const host = (headers.get('host') ?? '').toLowerCase().replace(/:\d+$/, '');
    if (!hosts.has(host)) return { ok: false, status: 404, reason: 'host' };

    const ip = getClientIp(headers, { header: cfg.ipHeader, trustedProxies: cfg.trustedProxies });
    if (ipEnforced && !isIpAllowed(ip, cfg.ipAllowlist)) return { ok: false, status: 403, reason: 'ip' };

    if (!cfg.isProd && cfg.devIdentity) return { ok: true, identity: cfg.devIdentity, ip };
    try {
      const identity = await cfg.verifyAccess(headers.get('cf-access-jwt-assertion'));
      return { ok: true, identity, ip };
    } catch {
      return { ok: false, status: 401, reason: 'unauthenticated' };
    }
  };
}
