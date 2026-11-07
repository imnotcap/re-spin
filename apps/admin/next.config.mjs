/** @type {import('next').NextConfig} */
export default {
  reactStrictMode: true,
  poweredByHeader: false, // skjul "X-Powered-By: Next.js"
  productionBrowserSourceMaps: false,
  // Interne workspace-pakker er TypeScript-kildekode og skal oversættes af Next
  transpilePackages: ['@respin/core', '@respin/db', '@respin/security', '@respin/payments', '@respin/support', '@respin/ui'],
  serverExternalPackages: ['postgres', 'stripe']
};
