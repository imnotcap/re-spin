import 'server-only';
import { desc, eq, or } from 'drizzle-orm';
import { schema, type Db } from '@respin/db';

const { orders, listings } = schema;
const fmt = (d: Date) => d.toLocaleDateString('da-DK', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Europe/Copenhagen' });

/** Kundens egne ordrer (som køber eller sælger) til valget "Hvilken ordre?" i en ny henvendelse */
export async function ordersForSupport(db: Db, userId: string): Promise<{ id: string; label: string }[]> {
  const rows = await db.select({ id: orders.id, title: listings.title, createdAt: orders.createdAt, buyerId: orders.buyerId })
    .from(orders).innerJoin(listings, eq(listings.id, orders.listingId))
    .where(or(eq(orders.buyerId, userId), eq(orders.sellerId, userId))).orderBy(desc(orders.createdAt)).limit(30);
  return rows.map((r) => ({ id: r.id, label: `${r.title} · ${r.buyerId === userId ? 'købt' : 'solgt'} ${fmt(r.createdAt)}` }));
}
