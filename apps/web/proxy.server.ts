import { NextResponse, type NextRequest } from 'next/server';
import { buildCsp, generateNonce, securityHeaders } from '@respin/security';
import { imageOrigin } from './lib/blob-origin';

const isProd = process.env.NODE_ENV === 'production';

/**
 * Kører før hver side: ny CSP-nonce pr. request + sikkerheds-headers.
 * (Nonce kræver dynamisk rendering – se layout.tsx.) Auth/autorisation sker IKKE her, men ved data-adgang.
 */
export function proxy(request: NextRequest) {
  const nonce = generateNonce();
  const csp = buildCsp({
    nonce,
    isDev: !isProd,
    // Stripe.js (betalingsformular) når den tages i brug: frameSrc: ['https://js.stripe.com', 'https://hooks.stripe.com'], connectSrc: ['https://api.stripe.com']
    // Annoncefotos ligger hos Vercel Blob (andet domæne end siden); CSP_IMG_SRC til evt. flere kilder
    imgSrc: [imageOrigin(), ...(process.env.CSP_IMG_SRC ?? '').split(',').map((s) => s.trim())].filter((s): s is string => !!s)
  });

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);
  requestHeaders.set('content-security-policy', csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set('content-security-policy', csp);
  for (const [k, v] of Object.entries(securityHeaders({ isProd }))) response.headers.set(k, v);
  return response;
}

export const config = {
  matcher: [{ source: '/((?!_next/static|_next/image|favicon.ico).*)', missing: [{ type: 'header', key: 'next-router-prefetch' }, { type: 'header', key: 'purpose', value: 'prefetch' }] }]
};
