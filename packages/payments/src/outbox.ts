/**
 * Outbox-worker: udfører eksterne handlinger (Stripe-overførsel til sælger, refundering) som ordre-flowet har lagt i
 * `outbox`. Hver handling har en idempotensnøgle, så et nedbrud midt i eller en genkørsel aldrig giver dobbelt
 * udbetaling. Fejl prøves igen med eksponentiel backoff; efter MAX_ATTEMPTS markeres de 'failed' (skal give alarm).
 */
import { and, eq, lte } from 'drizzle-orm';
import { schema, type Db } from '@respin/db';
import { ledger, ore } from '@respin/core';
import { postLedger } from './orders';
import type { StripeGateway } from './gateway';

const { outbox, orders, sellerProfiles } = schema;
export const MAX_ATTEMPTS = 8;
const backoffMs = (attempts: number) => Math.min(2 ** attempts, 60 * 24) * 60_000; // 2, 4, 8 … min. (maks. 1 døgn)

export interface OutboxRunResult { done: number; retried: number; failed: number }

export async function runOutbox(db: Db, gw: StripeGateway, opts: { now?: Date; limit?: number } = {}): Promise<OutboxRunResult> {
  const now = opts.now ?? new Date();
  const due = await db.select().from(outbox).where(and(eq(outbox.status, 'pending'), lte(outbox.runAfter, now))).orderBy(outbox.createdAt).limit(opts.limit ?? 25);
  const result: OutboxRunResult = { done: 0, retried: 0, failed: 0 };
  for (const job of due) {
    try {
      await execute(db, gw, job.topic, job.payload as { orderId: string; paymentIntentId?: string });
      await db.update(outbox).set({ status: 'done', doneAt: now, attempts: job.attempts + 1, lastError: null }).where(eq(outbox.id, job.id));
      result.done++;
    } catch (e) {
      const attempts = job.attempts + 1;
      const dead = attempts >= MAX_ATTEMPTS;
      await db.update(outbox).set({ attempts, status: dead ? 'failed' : 'pending', runAfter: new Date(now.getTime() + backoffMs(attempts)), lastError: (e instanceof Error ? e.message : String(e)).slice(0, 500) }).where(eq(outbox.id, job.id));
      dead ? result.failed++ : result.retried++;
    }
  }
  return result;
}

async function execute(db: Db, gw: StripeGateway, topic: string, payload: { orderId: string; paymentIntentId?: string }): Promise<void> {
  const [order] = await db.select().from(orders).where(eq(orders.id, payload.orderId));
  if (!order) throw new Error(`Ordre ${payload.orderId} findes ikke`);

  if (topic === 'stripe.transfer') {
    const [seller] = await db.select().from(sellerProfiles).where(eq(sellerProfiles.userId, order.sellerId));
    // Sælger har ikke gennemført Stripe-onboarding endnu → pengene ligger sikkert i seller_payable og prøves igen senere
    if (!seller?.stripeAccountId || !seller.payoutsEnabled) throw new Error('seller_not_payout_ready');
    const transfer = await gw.createTransfer({ amount: order.sellerPayoutOre, destination: seller.stripeAccountId, orderId: order.id, sourceTransaction: order.stripeChargeId, idempotencyKey: `transfer:${order.id}` });
    await db.transaction(async (tx) => {
      await tx.update(orders).set({ stripeTransferId: transfer.id }).where(eq(orders.id, order.id));
      await postLedger(tx, order.id, 'seller_paid_out', `seller_paid_out:${order.id}`, ledger.sellerPaidOut(order.sellerId, ore(order.sellerPayoutOre)));
    });
    return;
  }
  if (topic === 'stripe.refund') {
    const paymentIntentId = payload.paymentIntentId ?? order.stripePaymentIntentId;
    if (!paymentIntentId) throw new Error('Ordren har ingen PaymentIntent at refundere');
    await gw.createRefund({ paymentIntentId, orderId: order.id, idempotencyKey: `refund:${paymentIntentId}` });
    return;
  }
  throw new Error(`Ukendt outbox-emne: ${topic}`);
}
