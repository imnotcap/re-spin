/**
 * Penge = heltal i øre. Aldrig floating point, aldrig kr med decimaler.
 * Branded type gør, at man ikke ved et uheld blander kr og øre sammen.
 */
export type Ore = number & { readonly __brand: 'Ore' };

export const MAX_ORE = 100_000_000; // 1.000.000 kr – øvre grænse for ét beløb (hindrer overflow/misbrug)

export function ore(value: number): Ore {
  if (!Number.isSafeInteger(value)) throw new RangeError(`Beløb skal være et helt antal øre, fik ${value}`);
  if (Math.abs(value) > MAX_ORE) throw new RangeError(`Beløb uden for tilladt interval: ${value}`);
  return value as Ore;
}

/** Hele kroner → øre */
export const fromKr = (kr: number): Ore => ore(Math.round(kr * 100));

export const add = (...values: Ore[]): Ore => ore(values.reduce((a, b) => a + b, 0));
export const sub = (a: Ore, b: Ore): Ore => ore(a - b);

/**
 * Procentdel i basispoint (1 bp = 0,01 %), rundet "half up" til hele øre. Kun ikke-negative beløb.
 * Heltalsregning, så resultatet er identisk overalt.
 */
export function percentOf(amount: Ore, basisPoints: number): Ore {
  if (amount < 0) throw new RangeError('percentOf kræver et ikke-negativt beløb');
  if (!Number.isInteger(basisPoints) || basisPoints < 0) throw new RangeError('basisPoints skal være et ikke-negativt heltal');
  return ore(Math.floor((amount * basisPoints + 5_000) / 10_000));
}

/** 45000 → "450 kr." · 44550 → "445,50 kr." (kun til visning) */
export function formatOre(amount: Ore): string {
  const kr = amount / 100;
  return `${kr.toLocaleString('da-DK', { minimumFractionDigits: Number.isInteger(kr) ? 0 : 2, maximumFractionDigits: 2 })} kr.`;
}
