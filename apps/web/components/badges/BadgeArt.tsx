import type { BadgeId } from '@respin/core/badges';
import { badgeImage } from '../../lib/images';

/**
 * Videros badges som SVG-tegninger (public/img/badges): facetteret sekskant i skovgrøn/salvie/lime.
 * Låst: varme grå toner med en lille lås. Brug altid en tekst ved siden af – tegningen er dekorativ.
 */
export function BadgeArt({ id, earned = true, size = 64, className }: { id: BadgeId; earned?: boolean; size?: number; className?: string }) {
  return <img src={badgeImage(id, earned)} alt="" width={size} height={size} loading="lazy" decoding="async" className={className} />;
}
