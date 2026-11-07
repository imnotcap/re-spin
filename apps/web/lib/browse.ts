/**
 * Filtrering og sortering af varelister (kategori og søgning). Rene funktioner uden React,
 * så de kan testes. Filtrene ligger i URL'en; værdier, der ikke findes blandt valgmulighederne, ignoreres.
 */
import { CATEGORIES, CONDITIONS, type CategorySlug, type Condition } from './categories';
import type { CardItem } from '../components/ItemCard';

export interface BrowseItem extends CardItem {
  category: CategorySlug;
  sub: string;
  uploaded: number;
}

export const PRICE_BUCKETS = [
  { value: 'under-200', label: 'Under 200 kr.', min: 0, max: 200 },
  { value: '200-499', label: '200–499 kr.', min: 200, max: 500 },
  { value: '500-999', label: '500–999 kr.', min: 500, max: 1000 },
  { value: '1000-plus', label: '1.000 kr. og derover', min: 1000, max: Infinity }
] as const;
export type PriceBucket = (typeof PRICE_BUCKETS)[number]['value'];

export const SORTS = [
  { value: 'nyeste', label: 'Nyeste først' },
  { value: 'pris-lav', label: 'Pris: lav til høj' },
  { value: 'pris-hoej', label: 'Pris: høj til lav' },
  { value: 'populaere', label: 'Mest populære' }
] as const;
export type Sort = (typeof SORTS)[number]['value'];

export interface Filters {
  type?: string;
  kategori?: CategorySlug;
  str?: string;
  stand?: Condition;
  pris?: PriceBucket;
  maerke?: string;
  sort: Sort;
}

export const DEFAULT_FILTERS: Filters = { sort: 'nyeste' };
/** Nøglerne i URL'en (sort tæller ikke som et filter) */
export const FILTER_KEYS = ['type', 'kategori', 'str', 'stand', 'pris', 'maerke'] as const;

const LETTER_SIZES = ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL'];
const sizeRank = (s: string): number => {
  const i = LETTER_SIZES.indexOf(s.split(/[\s/]/)[0] ?? '');
  return i === -1 ? 100 : i;
};
/** "M" passer til "M / 38" – så størrelsesknapperne i menuen også finder kombinerede størrelser */
export const sizeMatches = (size: string, want: string): boolean => size === want || size.split(/\s*\/\s*/).includes(want);
/** Størrelser, der kan vælges i menuen, selvom ingen vare har præcis den værdi */
const MENU_SIZE = /^(XXS|XS|S|M|L|XL|XXL|\d{2})$/;

/** XS < S < M < L < XL, derefter tal i naturlig rækkefølge (36 < 38 < 104), "One size" sidst */
export const compareSizes = (a: string, b: string): number =>
  Number(a === 'One size') - Number(b === 'One size') || sizeRank(a) - sizeRank(b) || a.localeCompare(b, 'da', { numeric: true });

export interface BrowseOptions {
  types: string[];
  categories: CategorySlug[];
  sizes: string[];
  conditions: Condition[];
  brands: string[];
}

/** Kun de valg, der faktisk giver resultater i listen */
export function optionsFor(items: readonly BrowseItem[], types: readonly string[] = []): BrowseOptions {
  const present = <T,>(f: (i: BrowseItem) => T) => new Set(items.map(f));
  const subs = present((i) => i.sub);
  const cats = present((i) => i.category);
  const conds = present((i) => i.condition);
  return {
    types: types.filter((t) => subs.has(t)),
    categories: CATEGORIES.map((c) => c.slug).filter((c) => cats.has(c)),
    sizes: [...present((i) => i.size)].sort(compareSizes),
    conditions: CONDITIONS.filter((c) => conds.has(c)),
    brands: [...present((i) => i.brand)].sort((a, b) => a.localeCompare(b, 'da'))
  };
}

/** Læs filtre fra URL'en. Ukendte eller ugyldige værdier ignoreres. */
export function parseFilters(params: URLSearchParams, opt: BrowseOptions, knownTypes: readonly string[] = opt.types): Filters {
  const get = (k: string) => params.get(k) ?? undefined;
  const pick = <T extends string>(v: string | undefined, allowed: readonly T[]): T | undefined => (v !== undefined && (allowed as readonly string[]).includes(v) ? (v as T) : undefined);
  return {
    // Alle kategoriens typer accepteres (også dem uden varer endnu → "ingen varer" i stedet for alle varer)
    type: pick(get('type'), knownTypes),
    kategori: pick(get('kategori'), opt.categories),
    str: pick(get('str'), opt.sizes) ?? (MENU_SIZE.test(get('str') ?? '') ? get('str') : undefined),
    stand: pick(get('stand'), opt.conditions),
    pris: pick(get('pris'), PRICE_BUCKETS.map((b) => b.value)),
    maerke: pick(get('maerke'), opt.brands),
    sort: pick(get('sort'), SORTS.map((s) => s.value)) ?? 'nyeste'
  };
}

/** Skriv filtrene til URL-parametre. Andre parametre (fx `q`) bevares. */
export function filtersToSearch(f: Filters, keep: URLSearchParams): string {
  const p = new URLSearchParams(keep);
  for (const k of FILTER_KEYS) {
    const v = f[k];
    if (v) p.set(k, v); else p.delete(k);
  }
  if (f.sort !== 'nyeste') p.set('sort', f.sort); else p.delete('sort');
  return p.toString();
}

export const activeFilterCount = (f: Filters): number => FILTER_KEYS.filter((k) => f[k] !== undefined).length;

export function applyFilters(items: readonly BrowseItem[], f: Filters): BrowseItem[] {
  const bucket = PRICE_BUCKETS.find((b) => b.value === f.pris);
  const out = items.filter((i) =>
    (!f.type || i.sub === f.type) &&
    (!f.kategori || i.category === f.kategori) &&
    (!f.str || sizeMatches(i.size, f.str)) &&
    (!f.stand || i.condition === f.stand) &&
    (!f.maerke || i.brand === f.maerke) &&
    (!bucket || (i.price >= bucket.min && i.price < bucket.max)));
  const tie = (a: BrowseItem, b: BrowseItem) => a.uploaded - b.uploaded || a.id.localeCompare(b.id);
  const cmp: Record<Sort, (a: BrowseItem, b: BrowseItem) => number> = {
    nyeste: tie,
    'pris-lav': (a, b) => a.price - b.price || tie(a, b),
    'pris-hoej': (a, b) => b.price - a.price || tie(a, b),
    populaere: (a, b) => b.favorites - a.favorites || tie(a, b)
  };
  return out.sort(cmp[f.sort]);
}
