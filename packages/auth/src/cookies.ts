/**
 * Session-cookie. I produktion bruges `__Host-`-præfikset: browseren håndhæver da Secure, Path=/ og INGEN Domain
 * (cookien kan ikke sættes eller læses af andre subdomæner, fx admin eller et kompromitteret subdomæne).
 */
export const sessionCookieName = (isProd: boolean): string => (isProd ? '__Host-respin_session' : 'respin_session');

export function sessionCookieOptions(isProd: boolean, expires: Date) {
  return { httpOnly: true, secure: isProd, sameSite: 'lax' as const, path: '/', expires };
}
