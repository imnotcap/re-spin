import { cx } from '../utils';

/**
 * Videro-mærket: ét sammenhængende strøg. V'ets højre ben fortsætter op og bliver til en cirkelpil (genbrug), som
 * ender lige før V'ets venstre ben. Navnet (V) og kredsløbet er ét tegn: giv det videre, og lad det gå rundt.
 * Tegnet i et 64 × 64-felt, streg 7. `onLight`: skovgrøn til lys baggrund; ellers lime til mørk baggrund.
 */
const PATH = 'M23.6 28.0 L32.2 42.6 L46.78 13.09 A24 24 0 1 1 17.22 13.09';
const HEAD = 'M11.68 6.00 L25.89 6.32 L22.77 20.18 Z';

export function LogoMark({ size = 40, className, onLight }: { size?: number; className?: string; onLight?: boolean }) {
  const color = onLight ? '#0e5a2f' : '#d2ff32';
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={cx('rs-icon', className)} aria-hidden="true">
      <path d={PATH} fill="none" stroke={color} strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
      <path d={HEAD} fill={color} stroke={color} strokeWidth="3" strokeLinejoin="round" />
    </svg>
  );
}

/** Mærke + "videro". `size` er skriftstørrelsen i px. */
export function Wordmark({ size = 28, color = 'currentColor', className, onLight }: { size?: number; color?: string; className?: string; onLight?: boolean }) {
  return (
    <span className={cx('rs-row-flex', className)} style={{ gap: Math.round(size * 0.18), color }} aria-label="Videro" role="img">
      <LogoMark size={Math.round(size * 1.3)} onLight={onLight} />
      <span style={{ fontWeight: 800, fontSize: size, letterSpacing: '-0.04em', lineHeight: 1 }}>videro</span>
    </span>
  );
}
