/** Koder i databasen ↔ tekster på siden. Sikker at bruge i browseren. */
import type { ListingCategory, ListingCondition } from '@respin/core';
import { CATEGORIES, type Condition } from './categories';

export const CONDITION_LABEL: Record<ListingCondition, Condition> = {
  new_with_tag: 'Ny med mærke',
  new_without_tag: 'Ny uden mærke',
  very_good: 'Meget god',
  good: 'God',
  satisfactory: 'Tilfredsstillende'
};
export const CONDITION_CODES = Object.keys(CONDITION_LABEL) as ListingCondition[];

export const PARCEL_LABEL = { small: 'Lille pakke (op til 2 kg)', medium: 'Mellem pakke (op til 5 kg)' } as const;

export const categoryLabel = (slug: ListingCategory) => CATEGORIES.find((c) => c.slug === slug)?.label ?? slug;
export const subsOf = (slug: string): readonly string[] => CATEGORIES.find((c) => c.slug === slug)?.subs ?? [];

/** "450", "450,50", "1.250" eller "1 250" kr. → øre. null ved ugyldigt. */
export function parseKr(input: string): number | null {
  const s = input.trim().replace(/\s|kr\.?$/gi, '').replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.');
  if (!/^\d{1,6}(\.\d{1,2})?$/.test(s)) return null;
  return Math.round(Number(s) * 100);
}

export const LISTING_STATUS_LABEL = { draft: 'Kladde', active: 'Til salg', reserved: 'Reserveret', sold: 'Solgt', removed: 'Fjernet' } as const;
