/** re:spin – design tokens som TypeScript (spejler src/styles/tokens.css). Kan bruges i server components. */

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
  energy: 'linear-gradient(100deg, #0e5a2f 0%, #0a8a78 30%, #d2ff32 62%, #ff5a5f 92%)'
} as const;

export const spacing = { 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 8: 32, 10: 40, 12: 48 } as const;
export const radius = { sm: 6, md: 10, lg: 14, xl: 20, pill: 999 } as const;
export const fontSizes = { display: 32, h1: 26, h2: 20, h3: 17, body: 15, small: 13, caption: 12 } as const;

/** Reference til CSS-variabel: cssVar('forest') -> "var(--rs-forest)" */
export const cssVar = (name: string): string => `var(--rs-${name})`;
