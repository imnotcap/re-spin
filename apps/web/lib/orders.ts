import 'server-only';
/**
 * Køb og salg for den indloggede bruger. Kun køber og sælger kan se en ordre (andre får "findes ikke").
 * Ordrens status ændres KUN gennem tilstandsmaskinen (applyOrderEvent i @respin/payments).
 */
import { and, desc, eq, inArray, or, sql } from 'drizzle-orm';
import { schema, type Db } from '@respin/db';
import { availableEvents, type OrderEvent, type OrderStatus } from '@respin/core';
import { thumbKey, type ImageStore } from './image-store';

const { orders, orderEvents, listings, listingImages, users } = schema;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/** Handlinger brugere selv må udløse (resten er system/admin) */
export const USER_EVENTS = ['buyer_cancel', 'seller_ship', 'seller_cancel', 'buyer_received', 'buyer_approve', 'buyer_dispute'] as const satisfies readonly OrderEvent[];
export type UserEvent = (typeof USER_EVENTS)[number];

export const STATUS_LABEL: Record<OrderStatus, string> = {
  pending_payment: 'Afventer betaling', paid: 'Betalt – venter på afsendelse', shipped: 'Sendt', delivered: 'Modtaget',
  completed: 'Gennemført', disputed: 'Problem meldt', refunded: 'Refunderet', cancelled: 'Annulleret', expired: 'Udløbet'
};

const cover = sql<string | null>`(select storage_key from ${listingImages} li where li.listing_id = listings.id order by li.position limit 1)`;

export interface OrderRow {
  id: string; status: OrderStatus; role: 'buyer' | 'seller'; title: string; image: string | null; otherName: string;
  totalOre: number; payoutOre: number; createdAt: Date; needsAction: boolean
}

export async function myOrders(db: Db, store: ImageStore, userId: string): Promise<OrderRow[]> {
  const rows = await db.select({
    id: orders.id, status: orders.status, buyerId: orders.buyerId, title: listings.title, cover,
    buyerName: sql<string>`(select display_name from ${users} where id = ${orders.buyerId})`,
    sellerName: sql<string>`(select display_name from ${users} where id = ${orders.sellerId})`,
    totalOre: orders.buyerTotalOre, payoutOre: orders.sellerPayoutOre, createdAt: orders.createdAt
  }).from(orders).innerJoin(listings, eq(listings.id, orders.listingId))
    .where(and(or(eq(orders.buyerId, userId), eq(orders.sellerId, userId)), sql`${orders.status} <> 'expired'`))
    .orderBy(desc(orders.createdAt)).limit(200);
  return rows.map((r) => {
    const role = r.buyerId === userId ? 'buyer' : 'seller';
    return {
      id: r.id, status: r.status, role, title: r.title, image: r.cover ? store.urlFor(thumbKey(r.cover)) : null,
      otherName: role === 'buyer' ? r.sellerName : r.buyerName, totalOre: r.totalOre, payoutOre: r.payoutOre, createdAt: r.createdAt,
      needsAction: (role === 'seller' && r.status === 'paid') || (role === 'buyer' && (r.status === 'shipped' || r.status === 'delivered'))
    };
  });
}

/** Antal ordrer, hvor brugeren skal gøre noget (sende varen / bekræfte modtagelse) – til mærker i menuen */
export async function ordersNeedingAction(db: Db, userId: string): Promise<number> {
  const [r] = await db.select({ n: sql<number>`count(*)`.mapWith(Number) }).from(orders).where(or(
    and(eq(orders.sellerId, userId), eq(orders.status, 'paid')),
    and(eq(orders.buyerId, userId), inArray(orders.status, ['shipped', 'delivered']))
  ));
  return r?.n ?? 0;
}

export async function getOrder(db: Db, store: ImageStore, userId: string, id: string) {
  if (!UUID.test(id)) return null;
  const [o] = await db.select({ order: orders, title: listings.title, listingId: listings.id, cover }).from(orders)
    .innerJoin(listings, eq(listings.id, orders.listingId))
    .where(and(eq(orders.id, id), or(eq(orders.buyerId, userId), eq(orders.sellerId, userId))));
  if (!o) return null;
  const role = o.order.buyerId === userId ? 'buyer' : 'seller';
  const [other] = await db.select({ name: users.displayName, username: users.username }).from(users).where(eq(users.id, role === 'buyer' ? o.order.sellerId : o.order.buyerId));
  const events = await db.select({ event: orderEvents.event, to: orderEvents.toStatus, at: orderEvents.createdAt, actor: orderEvents.actorType })
    .from(orderEvents).where(eq(orderEvents.orderId, id)).orderBy(orderEvents.createdAt);
  const actions = availableEvents(o.order.status, role).filter((e): e is UserEvent => (USER_EVENTS as readonly string[]).includes(e));
  const { order } = o;
  return {
    id: order.id, role, status: order.status, title: o.title, listingId: o.listingId, image: o.cover ? store.urlFor(thumbKey(o.cover)) : null,
    other: other ?? { name: 'Slettet bruger', username: null },
    amounts: { price: order.priceOre, buyerFee: order.buyerFeeOre, shipping: order.shippingOre, total: order.buyerTotalOre, payout: order.sellerPayoutOre },
    // Adressen ser kun sælgeren (til forsendelsen) og køberen selv
    shippingAddress: order.shippingAddress,
    carrier: order.carrier, trackingNumber: order.trackingNumber,
    shipByAt: order.shipByAt, autoCompleteAt: order.autoCompleteAt, paymentExpiresAt: order.paymentExpiresAt,
    paidOut: !!order.stripeTransferId, createdAt: order.createdAt,
    events, actions
  };
}
