/**
 * Videro (videro.dk): hele platformen med login, konto, passkeys, to-trins-login, nonce-baseret CSP og
 * sikkerheds-headers (proxy.server.ts). Filer der hedder *.server.tsx / *.server.ts er sider og ruter, der kun
 * findes på serveren (konvention fra den tidligere statiske udgave – ufarlig at beholde).
 */

/** @type {import('next').NextConfig} */
export default {
  turbopack: {
    resolveAlias: {
      // Next' polyfills til gamle browsere: unødvendige for de understøttede browsere (se lib/no-polyfills.js)
      '../build/polyfills/polyfill-module': './lib/no-polyfills.js'
    }
  },
  // *.server.* skal stå først, så "page.server.tsx" læses som "page"
  pageExtensions: ['server.tsx', 'server.ts', 'tsx', 'ts'],
  serverExternalPackages: ['postgres', 'stripe', '@node-rs/argon2', 'sharp'],
  // Profiler har adressen /@/<profilnavn>; siden bor i app/profil/[name]
  async rewrites() { return [{ source: '/@/:name', destination: '/profil/:name/' }]; },
  // Gebyrsiden er nedlagt (0 % i kommission) – gamle links lander på gebyrafsnittet i "Sådan virker det"
  async redirects() { return [{ source: '/gebyrer/', destination: '/saadan-virker-det/#gebyrer', permanent: true }]; },
  productionBrowserSourceMaps: false,
  env: {
    // Kendt i browseren: om login findes (headerens konto-knap). Ingen hemmeligheder her.
    NEXT_PUBLIC_AUTH_ENABLED: '1',
    NEXT_PUBLIC_BASE_PATH: '',
    // Offentlig adresse til sitemap/robots/kanoniske links
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL || process.env.APP_URL || ''
  },
  trailingSlash: true,
  reactStrictMode: true,
  poweredByHeader: false, // skjul "X-Powered-By: Next.js"
  // Interne workspace-pakker er TypeScript-kildekode og skal oversættes af Next
  transpilePackages: ['@respin/core', '@respin/db', '@respin/security', '@respin/payments', '@respin/support', '@respin/auth', '@respin/ui']
};
