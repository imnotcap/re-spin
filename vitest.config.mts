import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  resolve: { alias: { 'server-only': fileURLToPath(new URL('./test/server-only.ts', import.meta.url)) } },
  test: {
    include: ['packages/*/src/**/*.test.ts', 'apps/*/lib/**/*.test.ts'],
    testTimeout: 30_000,
    hookTimeout: 60_000
  }
});
