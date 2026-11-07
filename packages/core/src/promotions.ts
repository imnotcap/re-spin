/** Fremhævning af annoncer: pakker og regler (én kilde til pris og varighed, bruges af app og betaling) */
export type PromotionPackageId = '1d' | '3d' | '7d';
export interface PromotionPackage { id: PromotionPackageId; days: number; priceOre: number; label: string; popular?: boolean }

export const PROMOTION_PACKAGES: readonly PromotionPackage[] = [
  { id: '1d', days: 1, priceOre: 1_900, label: '1 dag' },
  { id: '3d', days: 3, priceOre: 3_900, label: '3 dage', popular: true },
  { id: '7d', days: 7, priceOre: 6_900, label: '7 dage' }
];
export const promotionPackage = (id: string): PromotionPackage | undefined => PROMOTION_PACKAGES.find((p) => p.id === id);

/**
 * Periode for en ny, betalt fremhævning: starter nu – eller i forlængelse af en fremhævning, der stadig kører
 * (så to køb ikke overlapper og spilder dage).
 */
export function promotionPeriod(days: number, now: Date, currentEnd?: Date | null): { startsAt: Date; endsAt: Date } {
  const startsAt = currentEnd && currentEnd > now ? currentEnd : now;
  return { startsAt, endsAt: new Date(startsAt.getTime() + days * 86_400_000) };
}
