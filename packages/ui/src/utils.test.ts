import { describe, expect, it } from 'vitest';
import { buyerProtectionFee, sellerFee as coreSellerFee, sellerPayout as coreSellerPayout } from '@respin/core/fees';
import { formatOre, fromKr, ore } from '@respin/core/money';
import { buyerFee, buyerTotal, formatKr, sellerFee, sellerPayout } from './utils';

/** Kittet viser beløb i kr.; core (kilde til sandhed) regner i øre. De skal give præcis samme resultat. */
describe('kittets gebyrer = @respin/core', () => {
  it('for hver hel kronepris fra 1 til 100.000 kr.', () => {
    for (let kr = 1; kr <= 100_000; kr++) {
      const p = fromKr(kr);
      if (fromKr(buyerFee(kr)) !== buyerProtectionFee(p)) throw new Error(`buyerFee(${kr})`);
      if (fromKr(sellerFee(kr)) !== coreSellerFee(p, false)) throw new Error(`sellerFee(${kr})`);
      if (fromKr(sellerFee(kr, true)) !== coreSellerFee(p, true)) throw new Error(`sellerFee(${kr}, certificeret)`);
      if (fromKr(sellerPayout(kr, true)) !== coreSellerPayout(p, true)) throw new Error(`sellerPayout(${kr})`);
    }
  });

  it('kendte eksempler', () => {
    expect(buyerFee(450)).toBe(25.5);
    expect(buyerTotal(450, 39)).toBe(514.5);
    expect(sellerFee(450)).toBe(4.5);
    expect(sellerFee(1, true)).toBe(0.01); // 0,5 øre rundes op ("half up") som i core
    expect(sellerPayout(300)).toBe(297);
  });
});

describe('formatKr', () => {
  it('viser øre med to decimaler kun når der er nogen, som core', () => {
    expect(formatKr(450)).toBe('450\u00A0kr.');
    expect(formatKr(475.5)).toBe('475,50\u00A0kr.');
    expect(formatKr(100_000)).toBe('100.000\u00A0kr.');
    for (const o of [100, 4_550, 47_550, 10_504_200, 1, 99]) expect(formatKr(o / 100)).toBe(formatOre(ore(o)));
  });
});
