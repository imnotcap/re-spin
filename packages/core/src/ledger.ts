import { ore, type Ore } from './money';
import type { OrderAmounts } from './fees';

/**
 * Dobbelt bogholderi. Hver pengebevægelse er en transaktion med linjer, hvor sum(debet) = sum(kredit).
 * Linjer er append-only (database-trigger forhindrer UPDATE/DELETE) – rettelser sker med modposteringer.
 */
export type Direction = 'debit' | 'credit';
export interface LedgerLine { account: string; direction: Direction; amount: Ore }

export const accounts = {
  stripeBalance: 'asset:stripe_balance',
  escrow: (orderId: string) => `liability:escrow:${orderId}`,
  buyerFeeHeld: (orderId: string) => `liability:buyer_fee_held:${orderId}`,
  shippingHeld: (orderId: string) => `liability:shipping_held:${orderId}`,
  sellerPayable: (sellerId: string) => `liability:seller_payable:${sellerId}`,
  carrierPayable: 'liability:carrier_payable',
  revenueSellerFee: 'revenue:seller_fee',
  revenueBuyerFee: 'revenue:buyer_fee'
} as const;

const line = (account: string, direction: Direction, amount: Ore): LedgerLine => ({ account, direction, amount });

export class LedgerError extends Error {}

export function assertBalanced(lines: readonly LedgerLine[]): void {
  if (lines.length < 2) throw new LedgerError('En transaktion skal have mindst to linjer');
  let debit = 0, credit = 0;
  for (const l of lines) {
    if (!Number.isInteger(l.amount) || l.amount <= 0) throw new LedgerError(`Linjebeløb skal være positive heltal (${l.account}: ${l.amount})`);
    if (l.direction === 'debit') debit += l.amount; else credit += l.amount;
  }
  if (debit !== credit) throw new LedgerError(`Ubalance: debet ${debit} ≠ kredit ${credit}`);
}

const nonZero = (lines: LedgerLine[]): LedgerLine[] => lines.filter((l) => l.amount > 0);

/** Køber har betalt: pengene ligger hos Stripe, men skyldes sælger/fragt/os – de er "tilbageholdt". */
export function paymentCaptured(orderId: string, a: OrderAmounts): LedgerLine[] {
  const lines = nonZero([
    line(accounts.stripeBalance, 'debit', a.buyerTotal),
    line(accounts.escrow(orderId), 'credit', a.price),
    line(accounts.buyerFeeHeld(orderId), 'credit', a.buyerFee),
    line(accounts.shippingHeld(orderId), 'credit', a.shipping)
  ]);
  assertBalanced(lines);
  return lines;
}

/** Ordren er gennemført: tilbageholdte penge fordeles til sælger, os og fragtfirma. */
export function fundsReleased(orderId: string, sellerId: string, a: OrderAmounts): LedgerLine[] {
  const lines = nonZero([
    line(accounts.escrow(orderId), 'debit', a.price),
    line(accounts.sellerPayable(sellerId), 'credit', a.sellerPayout),
    line(accounts.revenueSellerFee, 'credit', a.sellerFee),
    line(accounts.buyerFeeHeld(orderId), 'debit', a.buyerFee),
    line(accounts.revenueBuyerFee, 'credit', a.buyerFee),
    line(accounts.shippingHeld(orderId), 'debit', a.shipping),
    line(accounts.carrierPayable, 'credit', a.shipping)
  ]);
  assertBalanced(lines);
  return lines;
}

/** Sælger har fået overført sin saldo via Stripe (reducerer det, vi skylder og har hos Stripe). */
export function sellerPaidOut(sellerId: string, amount: Ore): LedgerLine[] {
  const lines = [line(accounts.sellerPayable(sellerId), 'debit', amount), line(accounts.stripeBalance, 'credit', amount)];
  assertBalanced(lines);
  return lines;
}

/** Køber får alt tilbage (inkl. gebyr og fragt) før frigivelse. */
export function buyerRefunded(orderId: string, a: OrderAmounts): LedgerLine[] {
  const lines = nonZero([
    line(accounts.escrow(orderId), 'debit', a.price),
    line(accounts.buyerFeeHeld(orderId), 'debit', a.buyerFee),
    line(accounts.shippingHeld(orderId), 'debit', a.shipping),
    line(accounts.stripeBalance, 'credit', a.buyerTotal)
  ]);
  assertBalanced(lines);
  return lines;
}

/** Saldo pr. konto (kredit − debet for passiver; debet − kredit for aktiver). Bruges i tests og afstemning. */
export function balances(lines: readonly LedgerLine[]): Map<string, Ore> {
  const out = new Map<string, number>();
  for (const l of lines) out.set(l.account, (out.get(l.account) ?? 0) + (l.direction === 'debit' ? l.amount : -l.amount));
  return new Map([...out].map(([k, v]) => [k, ore(v)]));
}
