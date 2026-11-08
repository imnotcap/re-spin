import type { BadgeId } from '@respin/core/badges';

/**
 * Videros badges som SVG i samme stil som logoet: 64 × 64-felt, ét sammenhængende strøg med runde ender.
 * Optjent: skovgrøn medalje med lime tegn (særlige badges omvendt: lime medalje, skovgrønt tegn).
 * Låst: grå med en lille hængelås. Brug altid en tekst ved siden af (tegnet er dekorativt).
 */
const GLYPH: Record<BadgeId, string> = {
  // Prismærke
  first_listing: 'M21 23.5V33l14.5 14.5a2.5 2.5 0 0 0 3.5 0l8.5-8.5a2.5 2.5 0 0 0 0-3.5L33 21h-9.5A2.5 2.5 0 0 0 21 23.5z M27.5 27.5h.01',
  // Stak af pakker
  seller_10: 'M20 27l12-6 12 6v12l-12 6-12-6z M20 27l12 6 12-6 M32 33v12',
  // Pose med flueben
  first_sale: 'M21 27h22l-2 18H23z M26.5 27v-2.5a5.5 5.5 0 0 1 11 0V27 M27 36.5l3.5 3.5 6.5-6.5',
  // Kurve, der stiger
  sales_10: 'M19 43l9-9 6 6 11-12 M37 28h8v8',
  // Kredsløbet fra logoet (skaleret 13/24 om midten): genbrug
  sales_50: 'M40 21.76A13 13 0 1 1 24 21.76',
  // Skjold med flueben
  certified: 'M32 18l12 4.5v9.5c0 7.6-5 12.3-12 15-7-2.7-12-7.4-12-15v-9.5z M26.5 32.5l4 4 7.5-7.5',
  // Hængelås med nøglehul
  secure: 'M23 31h18v14H23z M26.5 31v-4.5a5.5 5.5 0 0 1 11 0V31 M32 37v2.5',
  // Profil
  profile: 'M32 32a5.5 5.5 0 1 0 0-11 5.5 5.5 0 0 0 0 11z M21.5 45c1.2-6.3 5.3-9.5 10.5-9.5s9.3 3.2 10.5 9.5',
  // Flamme
  popular: 'M32 46c-5.8 0-10-3.9-10-9.2 0-6.3 5.9-8.8 6.6-15.8 3.5 2.4 5.6 5.4 5.9 8.6 1.3-1.3 2.1-3 2.3-4.8 3.5 3 5.2 6.9 5.2 11.6 0 5.5-4.2 9.6-10 9.6z',
  // Fire felter (mange kategorier)
  variety: 'M21 21h8.5v8.5H21z M34.5 21H43v8.5h-8.5z M21 34.5h8.5V43H21z M34.5 34.5H43V43h-8.5z',
  // Flag
  pioneer: 'M24 46V19 M24 20.5h17l-4.5 6.5 4.5 6.5H24'
};

/** Udfyldte detaljer (pilespidsen fra logoet) */
const FILLED: Partial<Record<BadgeId, string>> = { sales_50: 'M21 17.92L28.69 18.09 27 25.6Z' };

/** Medalje med 12 runde takker (beregnet, så den er helt symmetrisk) */
const SEAL = Array.from({ length: 24 }, (_, i) => {
  const a = (i * Math.PI) / 12 - Math.PI / 2;
  const r = i % 2 ? 27.6 : 30.4;
  return `${i ? 'L' : 'M'}${(32 + r * Math.cos(a)).toFixed(2)} ${(32 + r * Math.sin(a)).toFixed(2)}`;
}).join(' ') + 'Z';

const FOREST = '#0e5a2f', LIME = '#d2ff32';

export function BadgeArt({ id, earned = true, special = false, size = 64, className }: { id: BadgeId; earned?: boolean; special?: boolean; size?: number; className?: string }) {
  const bg = !earned ? '#e7e5e0' : special ? LIME : FOREST;
  const fg = !earned ? '#a8a29e' : special ? FOREST : LIME;
  const ring = !earned ? '#d6d3cd' : special ? 'rgba(14,90,47,.28)' : 'rgba(210,255,50,.32)';
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} aria-hidden="true" focusable="false">
      {/* Medalje med takket kant (12 takker) – samme runde formsprog som logoet */}
      <path d={SEAL} fill={bg} stroke={bg} strokeWidth="3" strokeLinejoin="round" />
      <circle cx="32" cy="32" r="22.5" fill="none" stroke={ring} strokeWidth="1.5" />
      <path d={GLYPH[id]} fill="none" stroke={fg} strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round" />
      {FILLED[id] && <path d={FILLED[id]} fill={fg} stroke={fg} strokeWidth="1.6" strokeLinejoin="round" />}
      {!earned && (
        <g transform="translate(43 43)">
          <circle r="9" fill="#fff" stroke="#d6d3cd" strokeWidth="1.5" />
          <path d="M-3.6 -0.6h7.2v5.4h-7.2z M-2.2 -0.6v-1.8a2.2 2.2 0 0 1 4.4 0v1.8" fill="none" stroke="#78716c" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </g>
      )}
    </svg>
  );
}
