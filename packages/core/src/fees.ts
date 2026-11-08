import { add, ore, percentOf, sub, type Ore } from './money';

/**
 * Gebyrer (kilde til sandhed – UI'et viser kun resultatet).
 *  - Køber: køberbeskyttelse 5 % + 3 kr. (det er her, Videro tjener penge på handler)
 *  - Sælger: 0 % i kommission – sælger får hele salgsprisen. Videro tjener derudover på fremhævning af annoncer.
 * Sælgergebyret findes stadig som felt på ordren (altid 0), så gamle ordrer og regnskabet er uændrede.
 */
export const BUYER_PROTECTION_BPS = 500;
export const BUYER_PROTECTION_FIXED: Ore = ore(300);
export const SELLER_FEE_BPS = { standard: 0, certified: 0 } as const;

export const buyerProtectionFee = (price: Ore): Ore => add(percentOf(price, BUYER_PROTECTION_BPS), BUYER_PROTECTION_FIXED);
export const sellerFee = (price: Ore, certified: boolean): Ore => percentOf(price, certified ? SELLER_FEE_BPS.certified : SELLER_FEE_BPS.standard);
export const sellerPayout = (price: Ore, certified: boolean): Ore => sub(price, sellerFee(price, certified));

export interface OrderAmounts {
  price: Ore;
  buyerFee: Ore;
  sellerFee: Ore;
  shipping: Ore;
  /** Det køber betaler: pris + køberbeskyttelse + fragt */
  buyerTotal: Ore;
  /** Det sælger får udbetalt: pris − sælgergebyr (0 %, dvs. hele prisen) */
  sellerPayout: Ore;
}

/** Beregnes ÉN gang ved oprettelse af ordren og gemmes på ordren – genberegnes aldrig ud fra nuværende satser. */
export function computeOrderAmounts(input: { price: Ore; shipping: Ore; sellerCertified: boolean }): OrderAmounts {
  const buyerFee = buyerProtectionFee(input.price);
  const fee = sellerFee(input.price, input.sellerCertified);
  return {
    price: input.price,
    buyerFee,
    sellerFee: fee,
    shipping: input.shipping,
    buyerTotal: add(input.price, buyerFee, input.shipping),
    sellerPayout: sub(input.price, fee)
  };
}

/** Fragtpriser fastsættes af serveren. Klienten sender aldrig et fragtbeløb. */
export const SHIPPING_PRICE_ORE = { small: ore(3_900), medium: ore(4_900) } as const;
