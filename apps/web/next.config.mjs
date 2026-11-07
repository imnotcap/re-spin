/**
 * Én app, to måder at bygge den på:
 *
 *  - Server (standard – Vercel/Node): hele platformen med login, konto, passkeys, to-trins-login,
 *    nonce-baseret CSP og sikkerheds-headers (proxy.server.ts).
 *  - Statisk (STATIC_EXPORT=1 – GitHub Pages): kun de offentlige sider. Filer der kræver en server
 *    (*.server.tsx / *.server.ts: login, konto, API-ruter, proxy) er slet ikke med i bygget.
 *
 * NEXT_PUBLIC_BASE_PATH sættes kun ved statisk eksport til en projekt-side ("/re-spin").
 */
const isStatic = process.env.STATIC_EXPORT === '1';

const basePath = isStatic ? (process.env.NEXT_PUBLIC_BASE_PATH ?? '') : '';
if (basePath && !/^\/[A-Za-z0-9._-]+$/.test(basePath)) throw new Error(`Ugyldig NEXT_PUBLIC_BASE_PATH: ${basePath}`);

/** Medlemmernes annoncer: rigtig database-udgave i server-bygget, tom udgave i det statiske (se components/listings/live.tsx) */
const liveImpl = isStatic ? './components/listings/live.tsx' : './components/listings/live.server-impl.tsx';

/** @type {import('next').NextConfig} */
export default {
  turbopack: {
    resolveAlias: {
      '@respin-live': liveImpl,
      // Next' polyfills til gamle browsere: unødvendige for de understøttede browsere (se lib/no-polyfills.js)
      '../build/polyfills/polyfill-module': './lib/no-polyfills.js'
    }
  },
  ...(isStatic
    ? { output: 'export', basePath, images: { unoptimized: true }, pageExtensions: ['tsx', 'ts'] }
    : {
        // Server-filer tages med; *.server.* skal stå først, så "page.server.tsx" læses som "page"
        pageExtensions: ['server.tsx', 'server.ts', 'tsx', 'ts'],
        serverExternalPackages: ['postgres', 'stripe', '@node-rs/argon2', 'sharp'],
        productionBrowserSourceMaps: false
      }),
  env: {
    // Kendt i browseren: om login findes (headerens konto-knap). Ingen hemmeligheder her.
    NEXT_PUBLIC_AUTH_ENABLED: isStatic ? '0' : '1',
    NEXT_PUBLIC_BASE_PATH: basePath,
    // Offentlig adresse til sitemap/robots/kanoniske links: GitHub Pages sætter den i workflowet, Vercel bruger APP_URL
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL || (isStatic ? '' : process.env.APP_URL || '')
  },
  trailingSlash: true,
  reactStrictMode: true,
  poweredByHeader: false, // skjul "X-Powered-By: Next.js"
  // Interne workspace-pakker er TypeScript-kildekode og skal oversættes af Next
  transpilePackages: ['@respin/core', '@respin/db', '@respin/security', '@respin/payments', '@respin/auth', '@respin/ui']
};
