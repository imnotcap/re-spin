import { NextResponse, type NextRequest } from 'next/server';
import { buildCsp, generateNonce, securityHeaders } from '@respin/security';
import { getGuard } from './lib/guard';

const isProd = process.env.NODE_ENV === 'production';

/**
 * Første forsvarslinje på admin: host, IP-allowlist og Cloudflare Access-token afvises FØR siden renderes.
 * Det er IKKE det eneste tjek – hver side kalder requireStaff() og verificerer det hele igen.
 * Alle svar er no-store og noindex.
 */
export async function proxy(request: NextRequest) {
  const common = securityHeaders({ isProd, noStore: true, noIndex: true });
  const result = await getGuard()(request.headers);
  if (!result.ok) {
    // Minimal, ens svartekst: afslører ikke om det var host, IP eller token der fejlede
    return new NextResponse(result.status === 404 ? 'Not found' : 'Forbidden', { status: result.status === 401 ? 403 : result.status, headers: common });
  }

  const nonce = generateNonce();
  const csp = buildCsp({ nonce, isDev: !isProd });
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);
  requestHeaders.set('content-security-policy', csp);
  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set('content-security-policy', csp);
  for (const [k, v] of Object.entries(common)) response.headers.set(k, v);
  return response;
}

export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'] };
