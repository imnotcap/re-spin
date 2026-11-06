/**
 * Statisk eksport til GitHub Pages.
 * NEXT_PUBLIC_BASE_PATH sættes af deploy-workflowet til "/<repo-navn>" (projekt-sider ligger under en undermappe).
 * Lokalt er den tom, så siden virker på http://localhost:3030/.
 */
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? '';
if (basePath && !/^\/[A-Za-z0-9._-]+$/.test(basePath)) throw new Error(`Ugyldig NEXT_PUBLIC_BASE_PATH: ${basePath}`);

/** @type {import('next').NextConfig} */
export default {
  output: 'export',
  basePath,
  trailingSlash: true,            // GitHub Pages serverer mappe/index.html
  reactStrictMode: true,
  poweredByHeader: false,
  images: { unoptimized: true },  // ingen billed-server på statisk hosting
  transpilePackages: ['@respin/core']
};
