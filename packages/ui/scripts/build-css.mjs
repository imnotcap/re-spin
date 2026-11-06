// Samler CSS til dist/: styles.css = tokens + hjælpere + komponenter
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (f) => readFile(join(root, 'src/styles', f), 'utf8');
await mkdir(join(root, 'dist'), { recursive: true });
const styles = (await Promise.all(['tokens.css', 'utilities.css', 'components.css'].map(read))).join('\n');
await writeFile(join(root, 'dist/styles.css'), styles);
await writeFile(join(root, 'dist/reset.css'), await read('reset.css'));
await writeFile(join(root, 'dist/fonts.css'), await read('fonts.css'));
// Tailwind v4: @theme genereres ud fra de samme tokens som v3-preset'et (dist/tokens.js)
const { colorTokens, semanticColors, typeScale, radius, shadows, gradients } = await import('../dist/tokens.js');
const lines = [
  '/* @respin/ui – Tailwind v4 theme. Genereret af scripts/build-css.mjs – redigér ikke i hånden.',
  '   Brug sammen med styles.css (se README):',
  '     @import "tailwindcss";',
  '     @import "@respin/ui/styles.css" layer(components);',
  '     @import "@respin/ui/tailwind.css"; */',
  '@theme inline {',
  ...Object.keys(colorTokens).map((n) => `  --color-${n}: var(--rs-${n});`),
  ...Object.entries(semanticColors).map(([n, v]) => `  --color-${n}: ${v};`),
  '  --font-sans: var(--rs-font);',
  ...Object.entries(typeScale).flatMap(([n, t]) => [`  --text-${n}: ${t.size};`, `  --text-${n}--line-height: ${t.lineHeight};`, `  --text-${n}--font-weight: ${t.weight};`, `  --text-${n}--letter-spacing: ${t.letterSpacing};`]),
  ...Object.entries(radius).map(([n, v]) => `  --radius-${n}: ${v}px;`),
  ...Object.entries(shadows).map(([n]) => `  --shadow-${n}: var(--rs-shadow-${{ line: 1, raised: 2, float: 3 }[n]});`),
  '  --ease-respin: var(--rs-ease);',
  '  --ease-spring: var(--rs-ease-spring);',
  '  --spacing-gutter: 16px;',
  '  --spacing-tap: 44px;',
  '  --spacing-tabbar: var(--rs-tabbar-h);',
  '}',
  '',
  ...Object.keys(gradients).map((n) => `@utility bg-grad-${n} {\n  background-image: var(--rs-grad-${n});\n}`),
  ''
];
await writeFile(join(root, 'dist/tailwind.css'), lines.join('\n'));
console.log('CSS bygget:', (styles.length / 1024).toFixed(1), 'kB');
