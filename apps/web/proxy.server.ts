import { NextResponse, type NextRequest } from 'next/server';
import { MemoryRateLimiter, buildCsp, generateNonce, getClientIp, securityHeaders } from '@respin/security';
import { imageOrigin } from './lib/blob-origin';

const isProd = process.env.NODE_ENV === 'production';

/**
 * Første værn mod bots og automatiseret spam: grænse pr. IP for sider (GET) og især for handlinger (POST –
 * formularer, beskeder, uploads). Tællerne ligger i hukommelsen pr. serverinstans, så de er billige og stopper
 * storme med det samme; de præcise grænser pr. konto (beskeder, annoncer, bud …) ligger i databasen.
 * Webhooks (Stripe, Shipmondo) og cron har deres egen godkendelse og tælles ikke.
 */
const PAGE_LIMIT = new MemoryRateLimiter({ capacity: 240, refillPerSecond: 4 });   // 240 i træk, derefter 4/s
const ACTION_LIMIT = new MemoryRateLimiter({ capacity: 40, refillPerSecond: 0.5 }); // 40 i træk, derefter 30/min
const SAFE = new Set(['GET', 'HEAD', 'OPTIONS']);
const EXEMPT = /^\/api\/(webhooks|cron)\//;
const IP_HEADER = (['cf-connecting-ip', 'x-real-ip', 'x-forwarded-for'] as const).find((h) => h === process.env.TRUSTED_IP_HEADER) ?? 'x-forwarded-for';

/**
 * Kører før hver side: ny CSP-nonce pr. request + sikkerheds-headers.
 * (Nonce kræver dynamisk rendering – se layout.tsx.) Auth/autorisation sker IKKE her, men ved data-adgang.
 */
export async function proxy(request: NextRequest) {
  if (!EXEMPT.test(request.nextUrl.pathname)) {
    const ip = getClientIp(request.headers, { header: IP_HEADER, trustedProxies: Number(process.env.TRUSTED_PROXIES ?? 1) || 1 }) ?? 'ukendt';
    const safe = SAFE.has(request.method);
    const r = await (safe ? PAGE_LIMIT : ACTION_LIMIT).consume(`${safe ? 'side' : 'handling'}:${ip}`);
    if (!r.allowed) {
      const res = new NextResponse('For mange forespørgsler på kort tid. Vent et øjeblik, og prøv igen.', {
        status: 429, headers: { 'Retry-After': String(Math.max(1, Math.ceil(r.retryAfterMs / 1000))), 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' }
      });
      for (const [k, v] of Object.entries(securityHeaders({ isProd }))) res.headers.set(k, v);
      return res;
    }
  }
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
