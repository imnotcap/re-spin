import 'server-only';
/**
 * Ordrer i admin: søgning, detaljer med tidslinje, og refundering/tvistafgørelse.
 * Pengene flyttes ALDRIG direkte her – alt går gennem ordrens tilstandsmaskine (applyOrderEvent), der bogfører og
 * lægger Stripe-refunderingen i outbox i samme transaktion. Store beløb kræver en anden medarbejders godkendelse.
 */
import { alias } from 'drizzle-orm/pg-core';
import { and, asc, desc, eq, ilike, or, sql, type SQL } from 'drizzle-orm';
import { ORDER_STATUSES, type OrderStatus } from '@respin/core';
import { schema, type Db } from '@respin/db';
import { applyOrderEvent } from '@respin/payments';
import { needsSecondApproval, type Permission } from '@respin/security';

const { orders, orderEvents, listings, users, adminApprovals, staffUsers } = schema;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  pending_payment: 'Afventer betaling', paid: 'Betalt', shipped: 'Sendt', delivered: 'Leveret', completed: 'Gennemført',
  disputed: 'Tvist', refunded: 'Refunderet', cancelled: 'Annulleret', expired: 'Udløbet'
};

/** De admin-handlinger, der flytter penge tilbage til køber eller frigiver dem til sælger */
export const MONEY_ACTIONS = {
  admin_refund: { label: 'Refundér køber', permission: 'order.refund', from: ['paid', 'shipped', 'delivered'] },
  admin_resolve_buyer: { label: 'Afgør tvist: køber får pengene', permission: 'order.resolve_dispute', from: ['disputed'] },
  admin_resolve_seller: { label: 'Afgør tvist: sælger får pengene', permission: 'order.resolve_dispute', from: ['disputed'] }
} as const satisfies Record<string, { label: string; permission: Permission; from: readonly OrderStatus[] }>;
export type MoneyAction = keyof typeof MONEY_ACTIONS;
export const isMoneyAction = (v: string): v is MoneyAction => Object.hasOwn(MONEY_ACTIONS, v);

const buyer = alias(users, 'buyer');
const seller = alias(users, 'seller');

export interface OrderRow {
  id: string; status: OrderStatus; listingTitle: string; buyerName: string; buyerEmail: string; sellerName: string; sellerEmail: string;
  buyerTotalOre: number; createdAt: Date; updatedAt: Date;
}

export async function listOrders(db: Db, opts: { status?: string; q?: string; limit?: number } = {}): Promise<OrderRow[]> {
  const where: SQL[] = [];
  if (opts.status && (ORDER_STATUSES as readonly string[]).includes(opts.status)) where.push(eq(orders.status, opts.status as OrderStatus));
  const q = (opts.q ?? '').trim().slice(0, 100);
  if (q) {
    if (UUID.test(q)) where.push(eq(orders.id, q));
    else {
      const like = `%${q.replace(/[\\%_]/g, (m) => `\\${m}`)}%`;
      where.push(or(ilike(listings.title, like), ilike(buyer.email, like), ilike(seller.email, like), ilike(buyer.displayName, like), ilike(seller.displayName, like))!);
    }
  }
  return db.select({
    id: orders.id, status: orders.status, listingTitle: listings.title, buyerName: buyer.displayName, buyerEmail: buyer.email,
    sellerName: seller.displayName, sellerEmail: seller.email, buyerTotalOre: orders.buyerTotalOre, createdAt: orders.createdAt, updatedAt: orders.updatedAt
  }).from(orders).innerJoin(listings, eq(listings.id, orders.listingId)).innerJoin(buyer, eq(buyer.id, orders.buyerId)).innerJoin(seller, eq(seller.id, orders.sellerId))
    .where(where.length ? and(...where) : undefined).orderBy(desc(orders.updatedAt)).limit(Math.min(opts.limit ?? 100, 200));
}

export async function getOrder(db: Db, id: string) {
  if (!UUID.test(id)) return null;
  const [o] = await db.select({
    order: orders, listingTitle: listings.title, listingId: listings.id,
    buyerId: buyer.id, buyerName: buyer.displayName, buyerEmail: buyer.email, sellerId: seller.id, sellerName: seller.displayName, sellerEmail: seller.email
  }).from(orders).innerJoin(listings, eq(listings.id, orders.listingId)).innerJoin(buyer, eq(buyer.id, orders.buyerId)).innerJoin(seller, eq(seller.id, orders.sellerId))
    .where(eq(orders.id, id));
  if (!o) return null;
  const events = await db.select().from(orderEvents).where(eq(orderEvents.orderId, id)).orderBy(asc(orderEvents.createdAt));
  const approvals = await db.select({ id: adminApprovals.id, action: adminApprovals.action, status: adminApprovals.status, reason: adminApprovals.reason, createdAt: adminApprovals.createdAt, requestedBy: staffUsers.email })
    .from(adminApprovals).innerJoin(staffUsers, eq(staffUsers.id, adminApprovals.requestedBy))
    .where(and(eq(adminApprovals.targetType, 'order'), eq(adminApprovals.targetId, id))).orderBy(desc(adminApprovals.createdAt));
  return { ...o, events, approvals };
}

export type MoneyResult =
  | { ok: true; outcome: 'executed' | 'requested'; approvalId?: string }
  | { ok: false; error: 'not_found' | 'invalid_reason' | 'not_allowed' | 'already_requested' | 'failed'; message?: string };

const reasonOk = (r: string) => r.trim().length >= 5 && r.trim().length <= 500;

/**
 * Refundér eller afgør en tvist. Under grænsen udføres handlingen med det samme; fra grænsen (1.000 kr.)
 * oprettes en godkendelse, som en ANDEN medarbejder med samme rettighed skal godkende.
 */
export async function requestMoneyAction(db: Db, staffId: string, orderId: string, action: MoneyAction, reason: string): Promise<MoneyResult> {
  if (!reasonOk(reason)) return { ok: false, error: 'invalid_reason' };
  const o = UUID.test(orderId) ? (await db.select({ status: orders.status, total: orders.buyerTotalOre }).from(orders).where(eq(orders.id, orderId)))[0] : undefined;
  if (!o) return { ok: false, error: 'not_found' };
  const def = MONEY_ACTIONS[action];
  if (!(def.from as readonly string[]).includes(o.status)) return { ok: false, error: 'not_allowed', message: `Ikke muligt, når ordren er "${ORDER_STATUS_LABEL[o.status]}".` };
  if (needsSecondApproval(def.permission, o.total)) {
    try {
      const [a] = await db.insert(adminApprovals).values({
        permission: def.permission, action: `order.${action}`, targetType: 'order', targetId: orderId, amountOre: o.total, reason: reason.trim(), requestedBy: staffId
      }).returning({ id: adminApprovals.id });
      return { ok: true, outcome: 'requested', approvalId: a!.id };
    } catch (e) {
      if (String((e as { code?: string }).code ?? (e as { cause?: { code?: string } }).cause?.code) === '23505') return { ok: false, error: 'already_requested' };
      throw e;
    }
  }
  const r = await applyOrderEvent(db, { orderId, event: action, actor: 'admin', actorId: staffId, metadata: { reason: reason.trim() } });
  return r.ok ? { ok: true, outcome: 'executed' } : { ok: false, error: 'failed', message: r.message };
}

export async function listApprovals(db: Db, status: 'pending' | 'decided' = 'pending') {
  const requester = alias(staffUsers, 'requester');
  const decider = alias(staffUsers, 'decider');
  return db.select({
    id: adminApprovals.id, permission: adminApprovals.permission, action: adminApprovals.action, targetType: adminApprovals.targetType, targetId: adminApprovals.targetId,
    amountOre: adminApprovals.amountOre, reason: adminApprovals.reason, status: adminApprovals.status, createdAt: adminApprovals.createdAt, decidedAt: adminApprovals.decidedAt,
    decisionNote: adminApprovals.decisionNote, requestedById: adminApprovals.requestedBy, requestedBy: sql<string>`coalesce(${requester.displayName}, ${requester.email})`,
    decidedBy: sql<string | null>`coalesce(${decider.displayName}, ${decider.email})`
  }).from(adminApprovals).innerJoin(requester, eq(requester.id, adminApprovals.requestedBy)).leftJoin(decider, eq(decider.id, adminApprovals.decidedBy))
    .where(status === 'pending' ? eq(adminApprovals.status, 'pending') : sql`${adminApprovals.status} <> 'pending'`)
    .orderBy(status === 'pending' ? asc(adminApprovals.createdAt) : desc(adminApprovals.decidedAt)).limit(100);
}

export type DecideResult = { ok: true } | { ok: false; error: 'not_found' | 'own_request' | 'failed'; message?: string };

/**
 * Godkend eller afvis. Godkendelsen "låses" først (pending → approved, kun hvis det ikke er ens egen),
 * derefter udføres handlingen. Fejler den, rulles låsen tilbage, så en anden kan prøve igen.
 */
export async function decideApproval(db: Db, staffId: string, approvalId: string, approve: boolean, note: string, now = new Date()): Promise<DecideResult> {
  if (!UUID.test(approvalId)) return { ok: false, error: 'not_found' };
  const [a] = await db.select().from(adminApprovals).where(and(eq(adminApprovals.id, approvalId), eq(adminApprovals.status, 'pending')));
  if (!a) return { ok: false, error: 'not_found' };
  if (a.requestedBy === staffId) return { ok: false, error: 'own_request' };
  const claimed = await db.update(adminApprovals)
    .set({ status: approve ? 'approved' : 'rejected', decidedBy: staffId, decidedAt: now, decisionNote: note.trim().slice(0, 500) || null })
    .where(and(eq(adminApprovals.id, approvalId), eq(adminApprovals.status, 'pending'), sql`${adminApprovals.requestedBy} <> ${staffId}`))
    .returning({ id: adminApprovals.id });
  if (claimed.length !== 1) return { ok: false, error: 'not_found' };
  if (!approve) return { ok: true };
  const action = a.action.replace(/^order\./, '');
  if (a.targetType !== 'order' || !isMoneyAction(action)) return { ok: true };
  const r = await applyOrderEvent(db, { orderId: a.targetId, event: action, actor: 'admin', actorId: staffId, metadata: { reason: a.reason, approvalId, requestedBy: a.requestedBy } });
  if (!r.ok) {
    await db.update(adminApprovals).set({ status: 'pending', decidedBy: null, decidedAt: null, decisionNote: null }).where(eq(adminApprovals.id, approvalId));
    return { ok: false, error: 'failed', message: r.message };
  }
  return { ok: true };
}

export async function pendingApprovalCount(db: Db): Promise<number> {
  const [r] = await db.select({ n: sql<number>`count(*)`.mapWith(Number) }).from(adminApprovals).where(eq(adminApprovals.status, 'pending'));
  return r?.n ?? 0;
}
