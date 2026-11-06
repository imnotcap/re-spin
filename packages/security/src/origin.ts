/**
 * CSRF-forsvar i dybden (ud over SameSite=Lax/Strict-cookies): ved ændrende requests skal oprindelsen være kendt.
 * Brug kun på cookie-autentificerede endpoints; API-kald med Authorization-header er ikke CSRF-udsatte.
 */
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

export function isRequestOriginAllowed(method: string, headers: Headers, allowedOrigins: readonly string[]): boolean {
  if (SAFE_METHODS.has(method.toUpperCase())) return true;
  const fetchSite = headers.get('sec-fetch-site');
  if (fetchSite && fetchSite !== 'same-origin' && fetchSite !== 'none') return false;
  const origin = headers.get('origin');
  if (origin) return allowedOrigins.includes(origin);
  const referer = headers.get('referer');
  if (referer) { try { return allowedOrigins.includes(new URL(referer).origin); } catch { return false; } }
  return fetchSite === 'same-origin'; // ingen Origin/Referer: kun ok hvis browseren selv siger same-origin
}
