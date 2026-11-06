import { cx } from '../utils';

const PETALS: Array<[angle: number, length: number, color: string]> = [
  [0, 11, '#fdfbf7'], [45, 9, '#d2ff32'], [90, 11, '#d2ff32'], [135, 8, '#fdfbf7'],
  [180, 11, '#d2ff32'], [225, 9, '#fdfbf7'], [270, 11, '#fdfbf7'], [315, 8, '#d2ff32']
];

/** Det spinnende burst-mærke. `onLight` bruger forest i stedet for creme (til lys baggrund). */
export function LogoMark({ size = 40, className, onLight }: { size?: number; className?: string; onLight?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={cx('rs-icon', className)} aria-hidden="true">
      {PETALS.map(([angle, length, color]) => (
        <line key={angle} x1="32" y1="21" x2="32" y2={21 - length} stroke={onLight && color === '#fdfbf7' ? '#0e5a2f' : color} strokeWidth="8" strokeLinecap="round" transform={`rotate(${angle + 12} 32 32)`} />
      ))}
    </svg>
  );
}

/** Mærke + "re:spin". `size` er skriftstørrelsen i px. */
export function Wordmark({ size = 28, color = 'currentColor', className, onLight }: { size?: number; color?: string; className?: string; onLight?: boolean }) {
  return (
    <span className={cx('rs-row-flex', className)} style={{ gap: Math.round(size * 0.22), color }} aria-label="re:spin" role="img">
      <LogoMark size={Math.round(size * 1.1)} onLight={onLight} />
      <span style={{ fontWeight: 900, fontSize: size, letterSpacing: '-0.04em', lineHeight: 1 }}>re:spin</span>
    </span>
  );
}
