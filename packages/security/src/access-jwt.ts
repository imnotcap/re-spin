/**
 * Verificerer Cloudflare Access-JWT'en (`Cf-Access-Jwt-Assertion`) på admin-subdomænet.
 * Access håndterer SSO + MFA + IP-regler FØR trafikken når os; her verificerer vi, at requesten reelt kom
 * igennem Access (forhindrer at nogen rammer origin direkte), og læser medarbejderens e-mail.
 * Kun RS256 accepteres (forhindrer alg=none og HS256/nøgleforvekslings-angreb).
 */
import { createRemoteJWKSet, errors, jwtVerify, type JWTVerifyGetKey } from 'jose';

export class AccessError extends Error {
  constructor(message: string, readonly code: 'missing' | 'invalid') { super(message); }
}

export interface AccessConfig {
  /** fx "respin.cloudflareaccess.com" */
  teamDomain: string;
  /** Application Audience (AUD) tag fra Access-applikationen – hver app har sin egen */
  audience: string;
  /** Kun til test: egen nøglekilde i stedet for Cloudflares JWKS */
  jwks?: JWTVerifyGetKey;
}

export interface StaffIdentity { email: string; subject: string }

export function createAccessVerifier(cfg: AccessConfig): (token: string | null | undefined) => Promise<StaffIdentity> {
  if (!/^[a-z0-9.-]+$/i.test(cfg.teamDomain) || !cfg.audience) throw new Error('Ugyldig Access-konfiguration');
  const issuer = `https://${cfg.teamDomain}`;
  const jwks = cfg.jwks ?? createRemoteJWKSet(new URL(`${issuer}/cdn-cgi/access/certs`), { cooldownDuration: 30_000, cacheMaxAge: 10 * 60_000 });

  return async (token) => {
    if (!token) throw new AccessError('Mangler Access-token', 'missing');
    try {
      const { payload } = await jwtVerify(token, jwks, { issuer, audience: cfg.audience, algorithms: ['RS256'], clockTolerance: 30 });
      const email = typeof payload.email === 'string' ? payload.email.trim().toLowerCase() : '';
      if (!email || !payload.sub) throw new AccessError('Token mangler identitet', 'invalid');
      return { email, subject: payload.sub };
    } catch (e) {
      if (e instanceof AccessError) throw e;
      // Ingen detaljer videre til klienten (undgår orakel); intern fejltype kan logges af kalderen
      throw new AccessError(e instanceof errors.JOSEError ? e.code : 'verification_failed', 'invalid');
    }
  };
}
