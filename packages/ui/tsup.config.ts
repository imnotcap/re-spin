import { defineConfig } from 'tsup';

const shared = { format: ['esm', 'cjs'] as ('esm' | 'cjs')[], dts: true, sourcemap: true, external: ['react', 'react-dom', 'react/jsx-runtime'], splitting: false, target: 'es2020' };

export default defineConfig([
  // Komponenter: markeres som client-modul, så de kan importeres direkte fra Next.js (App Router)
  { ...shared, entry: { index: 'src/index.ts' }, clean: false, banner: { js: '"use client";' } },
  // Ren data/hjælpefunktioner: SKAL kunne bruges i server components, derfor uden "use client"
  { ...shared, entry: { utils: 'src/utils.ts', tokens: 'src/tokens.ts', 'tailwind-preset': 'src/tailwind-preset.ts' }, clean: false }
]);
