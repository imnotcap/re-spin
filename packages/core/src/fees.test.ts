import { describe, expect, it } from 'vitest';
import { buyerProtectionFee, computeOrderAmounts, sellerFee, sellerPayout } from './fees';
import { fromKr, ore } from './money';

describe('gebyrer', () => {
  it('køberbeskyttelse er 5 % + 3 kr.', () => {
    expect(buyerProtectionFee(fromKr(450))).toBe(fromKr(25.5)); // 22,50 + 3,00
    expect(buyerProtectionFee(fromKr(100))).toBe(fromKr(8));
  });
  it('sælgergebyr er 1 %, certificeret 0,5 %', () => {
    expect(sellerFee(fromKr(450), false)).toBe(ore(450));
    expect(sellerFee(fromKr(450), true)).toBe(ore(225));
    expect(sellerPayout(fromKr(450), true)).toBe(ore(44_775));
  });
  it('ordrebeløb summerer korrekt', () => {
    const a = computeOrderAmounts({ price: fromKr(450), shipping: fromKr(39), sellerCertified: false });
    expect(a.buyerTotal).toBe(a.price + a.buyerFee + a.shipping);
    expect(a.sellerPayout).toBe(a.price - a.sellerFee);
    expect(a.buyerTotal).toBe(fromKr(514.5));
  });
});
