/** re:spin – hjælpefunktioner og forretningsregler. Ingen React: kan bruges i server components. */
import type { IconName } from './icons/paths';

export { ICON_NAMES } from './icons/paths';

export type ClassValue = string | false | null | undefined;
export const cx = (...values: ClassValue[]): string => values.filter(Boolean).join(' ');

/** 450 -> "450 kr." */
export const formatKr = (amount: number): string => `${Math.round(amount).toLocaleString('da-DK')} kr.`;
/** 445.5 -> "445,5 kr." (op til 2 decimaler, kun hvis nødvendigt) */
export const formatKrDecimals = (amount: number): string =>
  `${(Math.round(amount * 100) / 100).toLocaleString('da-DK', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} kr.`;

/** Køberbeskyttelse: 5 % + 3 kr. */
export const BUYER_PROTECTION = { rate: 0.05, fixed: 3 } as const;
/** Gebyr til re:spin ved salg: 1 % (0,5 % for certificerede sælgere) */
export const SELLER_FEE_RATE = { standard: 0.01, certified: 0.005 } as const;

export const buyerFee = (price: number): number => Math.round(price * BUYER_PROTECTION.rate + BUYER_PROTECTION.fixed);
export const sellerFee = (price: number, certified = false): number =>
  Math.round(price * (certified ? SELLER_FEE_RATE.certified : SELLER_FEE_RATE.standard) * 100) / 100;
export const sellerPayout = (price: number, certified = false): number => price - sellerFee(price, certified);
/** Det køber betaler: pris + køberbeskyttelse + fragt */
export const buyerTotal = (price: number, shipping = 0): number => price + buyerFee(price) + shipping;

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
