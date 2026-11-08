/**
 * Videro Tailwind-preset (Tailwind v3).  Tailwind v4: brug i stedet `@respin/ui/tailwind.css`.
 *
 *   // tailwind.config.ts
 *   import { respinPreset } from '@respin/ui/tailwind-preset';
 *   export default { presets: [respinPreset], content: ['./app/**\/*.{ts,tsx}'] };
 *
 * Kræver stadig `@respin/ui/styles.css` (CSS-variablerne). Brand-farver er hex, så opacity-modifikatorer
 * virker (`bg-forest/50`); semantiske farver følger temaet via CSS-variabler.
 */
import { colorTokens, gradients, radius, semanticColors, shadows, typeScale } from './tokens';

/** { forest, 'forest-700' } -> { forest: { DEFAULT, 700 } } */
function nestColors(flat: Record<string, string>): Record<string, string | Record<string, string>> {
  const out: Record<string, Record<string, string>> = {};
  for (const [name, value] of Object.entries(flat)) {
    const [base, shade] = name.split('-') as [string, string | undefined];
    (out[base] ??= {})[shade ?? 'DEFAULT'] = value;
  }
  return out;
}

export interface RespinTailwindPreset {
  theme: { extend: Record<string, Record<string, unknown>> };
}

export const respinPreset: RespinTailwindPreset = {
  theme: {
    extend: {
      colors: { ...nestColors(colorTokens), ...semanticColors },
      fontFamily: { sans: ['var(--rs-font)'] },
      fontSize: Object.fromEntries(
        Object.entries(typeScale).map(([name, t]) => [name, [t.size, { lineHeight: t.lineHeight, fontWeight: t.weight, letterSpacing: t.letterSpacing }]])
      ),
      borderRadius: Object.fromEntries(Object.entries(radius).map(([k, v]) => [k, `${v}px`])),
      boxShadow: { ...shadows },
      backgroundImage: Object.fromEntries(Object.entries(gradients).map(([k]) => [`grad-${k}`, `var(--rs-grad-${k})`])),
      spacing: { gutter: '16px', tap: '44px', tabbar: 'var(--rs-tabbar-h)' },
      transitionTimingFunction: { respin: 'var(--rs-ease)', spring: 'var(--rs-ease-spring)' },
      transitionDuration: { fast: '120ms', base: '220ms', slow: '340ms' }
    }
  }
};

export default respinPreset;
