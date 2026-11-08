/**
 * Fremhævning – én kilde til pris og varighed (bruges af app og betaling). To slags:
 *  - annonce: annoncen vises øverst i feed, kategori og søgning med mærket «Fremhævet»
 *  - profil: sælgeren vises under «Fremhævede sælgere» på forsiden og får mærket på profilen
 * Certificerede sælgere betaler mindre (`certifiedPriceOre`). Prisen fastfryses ved køb og vælges altid af serveren.
 */
export type PromotionKind = 'listing' | 'profile';
export type PromotionPackageId = '1d' | '3d' | '7d';
export interface PromotionPackage { id: PromotionPackageId; days: number; priceOre: number; certifiedPriceOre: number; label: string; popular?: boolean }

export const PROMOTION_PACKAGES: readonly PromotionPackage[] = [
  { id: '1d', days: 1, priceOre: 1_900, certifiedPriceOre: 1_400, label: '1 dag' },
  { id: '3d', days: 3, priceOre: 3_900, certifiedPriceOre: 2_900, label: '3 dage', popular: true },
  { id: '7d', days: 7, priceOre: 6_900, certifiedPriceOre: 4_900, label: '7 dage' }
];

export const PROFILE_PROMOTION_PACKAGES: readonly PromotionPackage[] = [
  { id: '1d', days: 1, priceOre: 2_900, certifiedPriceOre: 1_900, label: '1 dag' },
  { id: '3d', days: 3, priceOre: 5_900, certifiedPriceOre: 3_900, label: '3 dage', popular: true },
  { id: '7d', days: 7, priceOre: 9_900, certifiedPriceOre: 6_900, label: '7 dage' }
];

export const promotionPackages = (kind: PromotionKind = 'listing') => (kind === 'profile' ? PROFILE_PROMOTION_PACKAGES : PROMOTION_PACKAGES);
export const promotionPackage = (id: string, kind: PromotionKind = 'listing'): PromotionPackage | undefined => promotionPackages(kind).find((p) => p.id === id);
/** Prisen for en sælger (certificerede får den lave pris) */
export const promotionPrice = (pkg: PromotionPackage, certified: boolean): number => (certified ? pkg.certifiedPriceOre : pkg.priceOre);
/** Laveste pris (til "fra X kr."-tekster) */
export const lowestPromotionPrice = (kind: PromotionKind = 'listing', certified = false): number => Math.min(...promotionPackages(kind).map((p) => promotionPrice(p, certified)));

/**
 * Periode for en ny, betalt fremhævning: starter nu – eller i forlængelse af en fremhævning, der stadig kører
 * (så to køb ikke overlapper og spilder dage).
 */
export function promotionPeriod(days: number, now: Date, currentEnd?: Date | null): { startsAt: Date; endsAt: Date } {
  const startsAt = currentEnd && currentEnd > now ? currentEnd : now;
  return { startsAt, endsAt: new Date(startsAt.getTime() + days * 86_400_000) };
}
