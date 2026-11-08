/**
 * Hjælpere til kategorier, menu og visning. Varerne kommer fra databasen (lib/listings.ts) –
 * der er ingen opdigtede eksempelvarer eller sælgere længere.
 */
import type { ListingImage } from './listings';
import { CATEGORIES, CONDITIONS, CONDITION_HELP, type Category, type CategorySlug, type Condition } from './categories';

export { CATEGORIES, CONDITIONS, CONDITION_HELP, type Category, type CategorySlug, type Condition };

const bySlug = new Map(CATEGORIES.map((c) => [c.slug, c]));
export const getCategory = (slug: string): Category | undefined => bySlug.get(slug as CategorySlug);

export const uploadedLabel = (days: number): string => (days <= 0 ? 'I dag' : days === 1 ? 'I går' : `For ${days} dage siden`);
/** Hele dage siden et tidspunkt */
export const daysSince = (iso: string, now = Date.now()): number => Math.max(0, Math.floor((now - new Date(iso).getTime()) / 86_400_000));

/** Størrelser, man kan vælge direkte i menuen (kun hvor det giver mening) */
const MENU_SIZES: Partial<Record<CategorySlug, string[]>> = {
  kvinder: ['XS', 'S', 'M', 'L', 'XL'],
  maend: ['S', 'M', 'L', 'XL', 'XXL'],
  boern: ['0-3 mdr.', '6-9 mdr.', '12-18 mdr.', '2-3 år', '4-5 år', '8-9 år']
};

export interface MenuCategory {
  count: number;
  /** Sat til salg inden for de seneste 7 dage */
  newWeek: number;
  likeNew: number;
  under200: number;
  brands: { brand: string; count: number }[];
  sizes: string[];
  /** Ugens fokus: den underkategori med flest annoncer og et billede fra den */
  focus?: { sub: string; image: Pick<ListingImage, 'src' | 'srcSet'> };
}
/** Lille opsummering til menuen – beregnes på serveren */
export interface MenuMeta { cats: Record<CategorySlug, MenuCategory>; brandTotal: number }

export interface StatsLike {
  cats: Partial<Record<CategorySlug, Omit<MenuCategory, 'sizes' | 'focus'> & { focus?: { sub: string; image: Pick<ListingImage, 'src' | 'srcSet'> } }>>;
  brands: unknown[];
}

const EMPTY: Omit<MenuCategory, 'sizes'> = { count: 0, newWeek: 0, likeNew: 0, under200: 0, brands: [] };

/** Menu-tal ud fra databasens tal (tomme kategorier får nuller) */
export const menuMetaFrom = (s: StatsLike | null): MenuMeta => ({
  cats: Object.fromEntries(CATEGORIES.map((c) => {
    const x = s?.cats[c.slug];
    return [c.slug, { ...EMPTY, ...(x ? { count: x.count, newWeek: x.newWeek, likeNew: x.likeNew, under200: x.under200, brands: x.brands } : {}),
      sizes: MENU_SIZES[c.slug] ?? [], ...(x?.focus ? { focus: { sub: x.focus.sub, image: { src: x.focus.image.src, srcSet: x.focus.image.srcSet } } } : {}) }];
  })) as Record<CategorySlug, MenuCategory>,
  brandTotal: s?.brands.length ?? 0
});

/**
 * Normaliser til søgning: små bogstaver, uden accenter (é → e) men med å (U+030A bevares),
 * apostroffer og punktummer fjernes ("Levi's" → "levis", "Dr. Martens" → "dr martens"), øvrig tegnsætning bliver mellemrum.
 */
export const normalize = (s: string): string =>
  s.toLocaleLowerCase('da-DK').normalize('NFKD').replace(/[̀-̉̋-ͯ]/g, '').normalize('NFC')
    .replace(/[.'’`´]/g, '').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
