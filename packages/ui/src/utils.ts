/** Videro – hjælpefunktioner og forretningsregler. Ingen React: kan bruges i server components. */
import type { IconName } from './icons/paths';

export { ICON_NAMES } from './icons/paths';

export type ClassValue = string | false | null | undefined;
export const cx = (...values: ClassValue[]): string => values.filter(Boolean).join(' ');

/**
 * Beløb i kr. → "450 kr." / "475,50 kr.": decimaler kun når der er øre, altid to (dansk skik),
 * og hårdt mellemrum før "kr.", så tal og enhed aldrig deles over to linjer.
 */
export const formatKr = (amount: number): string => {
  const ore = Math.round(amount * 100);
  const whole = ore % 100 === 0;
  return `${(ore / 100).toLocaleString('da-DK', { minimumFractionDigits: whole ? 0 : 2, maximumFractionDigits: 2 })}\u00A0kr.`;
};
/** @deprecated Samme som `formatKr` (som nu selv viser øre, når der er nogen). */
export const formatKrDecimals = formatKr;

/** Køberbeskyttelse: 5 % + 3 kr. */
export const BUYER_PROTECTION = { rate: 0.05, fixed: 3 } as const;
/** Gebyr til Videro ved salg: 1 % (0,5 % for certificerede sælgere) */
export const SELLER_FEE_RATE = { standard: 0.01, certified: 0.005 } as const;

/*
 * Gebyrerne regnes i hele øre med samme heltalsregning som @respin/core ("half up"), så kittet
 * altid viser præcis det beløb, som checkout opkræver. Ind og ud er kroner (fx 475.5).
 */
const toOre = (kr: number): number => Math.round(kr * 100);
const percentOfOre = (ore: number, basisPoints: number): number => Math.floor((ore * basisPoints + 5_000) / 10_000);

/** Køberbeskyttelse i kr. (5 % + 3 kr., præcis til øren): 450 → 25.5 */
export const buyerFee = (price: number): number => (percentOfOre(toOre(price), 500) + 300) / 100;
/** Sælgergebyr i kr.: 1 % (0,5 % for certificerede), præcis til øren */
export const sellerFee = (price: number, certified = false): number => percentOfOre(toOre(price), certified ? 50 : 100) / 100;
export const sellerPayout = (price: number, certified = false): number => (toOre(price) - toOre(sellerFee(price, certified))) / 100;
/** Det køber betaler: pris + køberbeskyttelse + fragt */
export const buyerTotal = (price: number, shipping = 0): number => (toOre(price) + toOre(buyerFee(price)) + toOre(shipping)) / 100;

export interface TabBarItem { id: string; label: string; icon: IconName; href: string; badge?: number }

/** Standardnavigationen. Spred og overskriv hrefs/badges efter behov: `{ ...RESPIN_TABS.items[2], badge: 2 }` */
export const RESPIN_TABS = {
  items: [
    { id: 'home', label: 'Hjem', icon: 'home', href: '/' },
    { id: 'search', label: 'Søg', icon: 'search', href: '/search' },
    { id: 'messages', label: 'Beskeder', icon: 'chat', href: '/messages' },
    { id: 'profile', label: 'Profil', icon: 'user', href: '/profile' }
  ] satisfies TabBarItem[],
  fab: { href: '/sell', label: 'Sælg noget', icon: 'plus' as IconName }
};
