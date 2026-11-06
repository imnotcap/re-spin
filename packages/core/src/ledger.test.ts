import { describe, expect, it } from 'vitest';
import { computeOrderAmounts } from './fees';
import { LedgerError, accounts, assertBalanced, balances, buyerRefunded, fundsReleased, paymentCaptured, sellerPaidOut } from './ledger';
import { fromKr, ore } from './money';

const PRICES = [100, 9_999, 45_000, 45_001, 123_457, 1_000_000, 10_000_000].map(ore);

describe('bogholderi', () => {
  it('afviser ubalancerede og ugyldige posteringer', () => {
    expect(() => assertBalanced([{ account: 'a', direction: 'debit', amount: ore(100) }, { account: 'b', direction: 'credit', amount: ore(99) }])).toThrow(LedgerError);
    expect(() => assertBalanced([{ account: 'a', direction: 'debit', amount: ore(0) }, { account: 'b', direction: 'credit', amount: ore(0) }])).toThrow(LedgerError);
    expect(() => assertBalanced([{ account: 'a', direction: 'debit', amount: ore(100) }])).toThrow(LedgerError);
  });

  for (const certified of [false, true]) {
    it(`betaling → frigivelse → udbetaling går i nul (certificeret=${certified})`, () => {
      for (const price of PRICES) {
        const a = computeOrderAmounts({ price, shipping: fromKr(39), sellerCertified: certified });
        const lines = [...paymentCaptured('o1', a), ...fundsReleased('o1', 's1', a), ...sellerPaidOut('s1', a.sellerPayout)];
        const b = balances(lines);
        expect(b.get(accounts.escrow('o1')) ?? 0).toBe(0);
        expect(b.get(accounts.buyerFeeHeld('o1')) ?? 0).toBe(0);
        expect(b.get(accounts.shippingHeld('o1')) ?? 0).toBe(0);
        expect(b.get(accounts.sellerPayable('s1')) ?? 0).toBe(0);
        // Det Stripe-saldo vi står tilbage med = det vi har tjent + fragt vi skylder fragtfirmaet
        expect(b.get(accounts.stripeBalance)).toBe(a.sellerFee + a.buyerFee + a.shipping);
        // Alt hænger sammen: samlet debet = samlet kredit
        expect([...b.values()].reduce((x, y) => x + y, 0)).toBe(0);
      }
    });
  }

  it('refundering før frigivelse giver køber alt tilbage og efterlader intet', () => {
    for (const price of PRICES) {
      const a = computeOrderAmounts({ price, shipping: fromKr(39), sellerCertified: false });
      const b = balances([...paymentCaptured('o2', a), ...buyerRefunded('o2', a)]);
      for (const v of b.values()) expect(v).toBe(0);
    }
  });
});
