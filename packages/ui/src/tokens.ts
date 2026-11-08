/** Videro – design tokens som TypeScript (spejler src/styles/tokens.css). Kan bruges i server components. */

export const colors = {
  forest: '#0e5a2f', forest700: '#0b4725', forest900: '#07301a',
  lime: '#d2ff32', lime600: '#b9e610',
  coral: '#ff5a5f', coral600: '#d93a41',
  cream: '#fdfbf7', cream200: '#f5f1e9', cream300: '#e9e4d8',
  slate: '#1c1c1c', slate700: '#3b3b38', slate500: '#6a6a64', slate300: '#a9a79f',
  stone50: '#f8f7f4', stone100: '#f0eeea', stone200: '#e4e2dd', stone300: '#d3d1cb', stone400: '#b4b2ab'
} as const;

export const gradients = {
  ink: 'linear-gradient(145deg, #3a3a36 0%, #262624 55%, #1c1c1c 100%)',
  lime: 'linear-gradient(125deg, #f1ff8f 0%, #d2ff32 38%, #8fe86a 72%, #4fcf8e 100%)',
  forest: 'linear-gradient(135deg, #052818 0%, #0e5a2f 45%, #0a7a63 100%)',
  deep: 'linear-gradient(160deg, #0a7a63 0%, #0e5a2f 38%, #07301a 85%)',
  accent: 'linear-gradient(90deg, #1c1c1c 0%, #55554f 100%)',
  card: 'linear-gradient(160deg, #ffffff 0%, #f3f0ea 100%)',
  stone: 'linear-gradient(160deg, #f4f2ee 0%, #dedbd4 100%)',
  energy: 'linear-gradient(100deg, #0e5a2f 0%, #0a8a78 30%, #d2ff32 62%, #ff5a5f 92%)'
} as const;

export const shadows = {
  line: '0 0 0 1px rgba(28, 28, 28, 0.06)',
  raised: '0 2px 8px rgba(28, 28, 28, 0.08)',
  float: '0 8px 24px rgba(28, 28, 28, 0.14)'
} as const;

/** Semantiske farver (følger temaet): canvas = baggrund, ink = tekst, line = streg … */
export const semanticColors = {
  canvas: 'var(--rs-bg)', surface: 'var(--rs-surface)', sunken: 'var(--rs-surface-sunk)',
  ink: 'var(--rs-text)', muted: 'var(--rs-text-muted)', line: 'var(--rs-border)',
  brand: 'var(--rs-brand)', action: 'var(--rs-action)', buy: 'var(--rs-buy)', danger: 'var(--rs-danger)'
} as const;

/** Typografi-skalaen (spejler .rs-t-* i CSS) */
export const typeScale = {
  display: { size: '32px', lineHeight: '36px', weight: '800', letterSpacing: '-0.02em' },
  h1: { size: '26px', lineHeight: '32px', weight: '800', letterSpacing: '-0.015em' },
  h2: { size: '20px', lineHeight: '26px', weight: '700', letterSpacing: '-0.01em' },
  h3: { size: '17px', lineHeight: '24px', weight: '700', letterSpacing: '0' },
  body: { size: '15px', lineHeight: '22px', weight: '400', letterSpacing: '0' },
  small: { size: '13px', lineHeight: '18px', weight: '400', letterSpacing: '0' },
  caption: { size: '12px', lineHeight: '16px', weight: '400', letterSpacing: '0' }
} as const;

/** Farve-tokens med kebab-navne: 'forest', 'forest-700', 'stone-100' … (= CSS-variablen `--rs-<navn>`) */
export const colorTokens: Record<string, string> = Object.fromEntries(
  Object.entries(colors).map(([k, v]) => [k.replace(/([a-z])(\d)/g, '$1-$2'), v])
);

export const spacing = { 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 8: 32, 10: 40, 12: 48 } as const;
export const radius = { sm: 6, md: 10, lg: 14, xl: 20, pill: 999 } as const;
export const fontSizes = { display: 32, h1: 26, h2: 20, h3: 17, body: 15, small: 13, caption: 12 } as const;

/** Reference til CSS-variabel: cssVar('forest') -> "var(--rs-forest)" */
export const cssVar = (name: string): string => `var(--rs-${name})`;
