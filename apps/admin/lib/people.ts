import 'server-only';
/** Brugere, moderation, nøgletal og audit-log til admin. Ingen adgangskontrol her – den sker i siderne/handlingerne. */
import { and, count, desc, eq, ilike, inArray, isNull, or, sql } from 'drizzle-orm';
import { schema, type Db } from '@respin/db';

const { users, listings, orders, sessions, supportCases, reports, auditLog, listingPromotions, staffUsers } = schema;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const likeOf = (q: string) => `%${q.replace(/[\\%_]/g, (m) => `\\${m}`)}%`;

/* ------------------------------ Brugere ------------------------------ */

export async function searchUsers(db: Db, q: string, limit = 50) {
  const s = q.trim().slice(0, 100);
  const where = !s ? undefined : UUID.test(s) ? eq(users.id, s) : or(ilike(users.email, likeOf(s)), ilike(users.displayName, likeOf(s)), ilike(users.username, likeOf(s)));
  return db.select({ id: users.id, email: users.email, name: users.displayName, username: users.username, status: users.status, createdAt: users.createdAt, verified: users.emailVerifiedAt })
    .from(users).where(where).orderBy(desc(users.createdAt)).limit(Math.min(limit, 200));
}

export async function getUser(db: Db, id: string) {
  if (!UUID.test(id)) return null;
  const [u] = await db.select({ id: users.id, email: users.email, name: users.displayName, username: users.username, status: users.status, createdAt: users.createdAt, verified: users.emailVerifiedAt, bio: users.bio })
    .from(users).where(eq(users.id, id));
  if (!u) return null;
  const [userListings, userOrders, cases, activeSessions] = await Promise.all([
    db.select({ id: listings.id, title: listings.title, status: listings.status, moderation: listings.moderationStatus, priceOre: listings.priceOre, createdAt: listings.createdAt })
      .from(listings).where(eq(listings.sellerId, id)).orderBy(desc(listings.createdAt)).limit(20),
    db.select({ id: orders.id, status: orders.status, total: orders.buyerTotalOre, buyerId: orders.buyerId, createdAt: orders.createdAt, title: listings.title })
      .from(orders).innerJoin(listings, eq(listings.id, orders.listingId)).where(or(eq(orders.buyerId, id), eq(orders.sellerId, id))).orderBy(desc(orders.createdAt)).limit(20),
    db.select({ id: supportCases.id, number: supportCases.number, subject: supportCases.subject, status: supportCases.status, updatedAt: supportCases.updatedAt })
      .from(supportCases).where(eq(supportCases.userId, id)).orderBy(desc(supportCases.updatedAt)).limit(20),
    db.select({ n: count() }).from(sessions).where(and(eq(sessions.userId, id), isNull(sessions.revokedAt), sql`${sessions.expiresAt} > now()`))
  ]);
  return { ...u, listings: userListings, orders: userOrders, cases, activeSessions: activeSessions[0]?.n ?? 0 };
}

/** Spær eller genåbn en bruger. Ved spærring logges brugeren ud overalt, og aktive annoncer skjules (status bevares). */
export async function setUserStatus(db: Db, id: string, status: 'active' | 'suspended', now = new Date()): Promise<boolean> {
  if (!UUID.test(id)) return false;
  return db.transaction(async (tx) => {
    const r = await tx.update(users).set({ status }).where(and(eq(users.id, id), inArray(users.status, ['active', 'suspended']))).returning({ id: users.id });
    if (r.length !== 1) return false;
    if (status === 'suspended') await tx.update(sessions).set({ revokedAt: now }).where(and(eq(sessions.userId, id), isNull(sessions.revokedAt)));
    return true;
  });
}

/* ------------------------------ Moderation ------------------------------ */

export async function pendingListings(db: Db) {
  return db.select({ id: listings.id, title: listings.title, description: listings.description, priceOre: listings.priceOre, createdAt: listings.createdAt, sellerId: users.id, sellerName: users.displayName, sellerEmail: users.email })
    .from(listings).innerJoin(users, eq(users.id, listings.sellerId))
    .where(and(eq(listings.moderationStatus, 'pending'), inArray(listings.status, ['active', 'draft']))).orderBy(listings.createdAt).limit(100);
}

export async function moderateListing(db: Db, id: string, decision: 'approved' | 'rejected'): Promise<boolean> {
  if (!UUID.test(id)) return false;
  const r = await db.update(listings).set({ moderationStatus: decision }).where(and(eq(listings.id, id), eq(listings.moderationStatus, 'pending'))).returning({ id: listings.id });
  return r.length === 1;
}

export async function openReports(db: Db) {
  return db.select({ id: reports.id, targetType: reports.targetType, targetId: reports.targetId, reason: reports.reason, createdAt: reports.createdAt, reporter: users.email })
    .from(reports).leftJoin(users, eq(users.id, reports.reporterId)).where(eq(reports.status, 'open')).orderBy(reports.createdAt).limit(100);
}

export async function handleReport(db: Db, id: string, staffId: string, decision: 'actioned' | 'dismissed', now = new Date()): Promise<boolean> {
  if (!UUID.test(id)) return false;
  const r = await db.update(reports).set({ status: decision, handledBy: staffId, handledAt: now }).where(and(eq(reports.id, id), eq(reports.status, 'open'))).returning({ id: reports.id });
  return r.length === 1;
}

/* ------------------------------ Nøgletal ------------------------------ */

const iso = (d: Date) => d.toISOString();

/** Tal til oversigten. Beløb i øre. Perioder: seneste 7 og 30 dage. */
export async function dashboardStats(db: Db, now = new Date()) {
  const d7 = new Date(now.getTime() - 7 * 86_400_000), d30 = new Date(now.getTime() - 30 * 86_400_000);
  const [[u], [l], [o], [p], [s], [r]] = await Promise.all([
    db.select({ total: count(), new7: sql<number>`count(*) filter (where ${users.createdAt} >= ${iso(d7)}::timestamptz)`.mapWith(Number), suspended: sql<number>`count(*) filter (where ${users.status} = 'suspended')`.mapWith(Number) }).from(users),
    db.select({ active: sql<number>`count(*) filter (where ${listings.status} = 'active' and ${listings.moderationStatus} = 'approved')`.mapWith(Number), pending: sql<number>`count(*) filter (where ${listings.moderationStatus} = 'pending' and ${listings.status} in ('active','draft'))`.mapWith(Number), new7: sql<number>`count(*) filter (where ${listings.createdAt} >= ${iso(d7)}::timestamptz)`.mapWith(Number) }).from(listings),
    db.select({
      gmv30: sql<number>`coalesce(sum(${orders.priceOre}) filter (where ${orders.status} in ('paid','shipped','delivered','completed') and ${orders.createdAt} >= ${iso(d30)}::timestamptz), 0)`.mapWith(Number),
      count30: sql<number>`count(*) filter (where ${orders.status} in ('paid','shipped','delivered','completed') and ${orders.createdAt} >= ${iso(d30)}::timestamptz)`.mapWith(Number),
      disputed: sql<number>`count(*) filter (where ${orders.status} = 'disputed')`.mapWith(Number),
      inProgress: sql<number>`count(*) filter (where ${orders.status} in ('paid','shipped','delivered'))`.mapWith(Number),
      refunded30: sql<number>`count(*) filter (where ${orders.status} = 'refunded' and ${orders.updatedAt} >= ${iso(d30)}::timestamptz)`.mapWith(Number)
    }).from(orders),
    db.select({ revenue30: sql<number>`coalesce(sum(${listingPromotions.priceOre}) filter (where ${listingPromotions.status} = 'paid' and ${listingPromotions.createdAt} >= ${iso(d30)}::timestamptz), 0)`.mapWith(Number), active: sql<number>`count(*) filter (where ${listingPromotions.status} = 'paid' and ${listingPromotions.endsAt} > now())`.mapWith(Number) }).from(listingPromotions),
    db.select({
      open: sql<number>`count(*) filter (where ${supportCases.status} = 'open')`.mapWith(Number),
      unassigned: sql<number>`count(*) filter (where ${supportCases.status} = 'open' and ${supportCases.assigneeId} is null)`.mapWith(Number),
      waitingOver24h: sql<number>`count(*) filter (where ${supportCases.status} = 'open' and ${supportCases.lastCustomerAt} < now() - interval '24 hours' and (${supportCases.lastStaffAt} is null or ${supportCases.lastStaffAt} < ${supportCases.lastCustomerAt}))`.mapWith(Number)
    }).from(supportCases),
    db.select({ open: count() }).from(reports).where(eq(reports.status, 'open'))
  ]);
  return { users: u!, listings: l!, orders: o!, promotions: p!, support: s!, reports: r!.open };
}

/** Nye brugere, annoncer og sager pr. dag de seneste `days` dage (dansk tid), også dage med 0 */
export async function dailySeries(db: Db, days = 14) {
  const rows = await db.execute<{ day: string; users: number; listings: number; cases: number }>(sql`
    with d as (select generate_series((now() at time zone 'Europe/Copenhagen')::date - ${days - 1}::int, (now() at time zone 'Europe/Copenhagen')::date, interval '1 day')::date as day)
    select to_char(d.day, 'YYYY-MM-DD') as day,
      (select count(*)::int from ${users} where (${users.createdAt} at time zone 'Europe/Copenhagen')::date = d.day) as users,
      (select count(*)::int from ${listings} where (${listings.createdAt} at time zone 'Europe/Copenhagen')::date = d.day) as listings,
      (select count(*)::int from ${supportCases} where (${supportCases.createdAt} at time zone 'Europe/Copenhagen')::date = d.day) as cases
    from d order by d.day`);
  const list = Array.isArray(rows) ? rows : (rows as unknown as { rows: typeof rows }).rows;
  return (list as Array<{ day: string; users: number; listings: number; cases: number }>).map((r) => ({ day: r.day, users: Number(r.users), listings: Number(r.listings), cases: Number(r.cases) }));
}

/* ------------------------------ Audit-log ------------------------------ */

export async function auditEntries(db: Db, opts: { action?: string; actor?: string; limit?: number } = {}) {
  const where = and(
    opts.action ? ilike(auditLog.action, `${opts.action.replace(/[\\%_]/g, (m) => `\\${m}`).slice(0, 60)}%`) : undefined,
    opts.actor && UUID.test(opts.actor) ? eq(auditLog.actorId, opts.actor) : undefined
  );
  return db.select({ id: auditLog.id, actorType: auditLog.actorType, actorId: auditLog.actorId, actor: staffUsers.email, action: auditLog.action, targetType: auditLog.targetType, targetId: auditLog.targetId, ip: auditLog.ip, metadata: auditLog.metadata, createdAt: auditLog.createdAt })
    .from(auditLog).leftJoin(staffUsers, and(eq(auditLog.actorType, 'staff'), sql`${staffUsers.id}::text = ${auditLog.actorId}`))
    .where(where).orderBy(desc(auditLog.createdAt)).limit(Math.min(opts.limit ?? 200, 500));
}

export async function activeStaff(db: Db) {
  return db.select({ id: staffUsers.id, email: staffUsers.email, name: staffUsers.displayName, role: staffUsers.role }).from(staffUsers).where(eq(staffUsers.active, true)).orderBy(staffUsers.email);
}

