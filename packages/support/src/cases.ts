/**
 * Kundeservice-sager. To slags adgang:
 *  - Kunden (hjemmesiden): kun egne sager – user_id indgår i HVER forespørgsel, så andres sager svarer "findes ikke".
 *    Kunden ser aldrig interne noter.
 *  - Medarbejdere (admin): alle sager. Rettigheden tjekkes i admin-appen, før funktionerne kaldes.
 * Al tekst gemmes som ren tekst (normaliseret) og vises escapet.
 */
import { and, asc, count, desc, eq, ilike, inArray, isNull, ne, or, sql, type SQL } from 'drizzle-orm';
import { z } from 'zod';
import { normalizeUserText } from '@respin/core';
import { schema, type Db } from '@respin/db';

const { supportCases, supportMessages, users, staffUsers, orders, listings } = schema;

export const SUPPORT_CATEGORIES = schema.SUPPORT_CATEGORIES;
export const SUPPORT_STATUSES = schema.SUPPORT_STATUSES;
export const SUPPORT_PRIORITIES = schema.SUPPORT_PRIORITIES;
export type SupportCategory = (typeof SUPPORT_CATEGORIES)[number];
export type SupportStatus = (typeof SUPPORT_STATUSES)[number];
export type SupportPriority = (typeof SUPPORT_PRIORITIES)[number];

export const CATEGORY_LABEL: Record<SupportCategory, string> = {
  order: 'Ordre og levering', payment: 'Betaling og refundering', account: 'Konto og login',
  listing: 'Annonce', safety: 'Svindel og sikkerhed', other: 'Andet'
};
export const STATUS_LABEL: Record<SupportStatus, string> = {
  open: 'Åben', pending_customer: 'Venter på kunden', resolved: 'Løst', closed: 'Lukket'
};
export const PRIORITY_LABEL: Record<SupportPriority, string> = { low: 'Lav', normal: 'Normal', high: 'Høj', urgent: 'Haster' };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const text = (min: number, max: number) => z.string().max(max * 4).transform(normalizeUserText).pipe(z.string().min(min).max(max));
export const MESSAGE_MAX = 4000;

export type SupportError = 'invalid_input' | 'not_found' | 'closed';
export type Result<T = object> = ({ ok: true } & T) | { ok: false; error: SupportError; field?: string };

/* ------------------------------ Kunden ------------------------------ */

const newCaseInput = z.object({
  subject: text(3, 120),
  category: z.enum(SUPPORT_CATEGORIES),
  message: text(10, MESSAGE_MAX),
  orderId: z.string().regex(UUID).optional().or(z.literal('').transform(() => undefined))
}).strict();

/** Kunden opretter en sag. En ordre kan kun knyttes til, hvis kunden er køber eller sælger på den. */
export async function createCase(db: Db, userId: string, raw: unknown, now = new Date()): Promise<Result<{ id: string; number: number }>> {
  const p = newCaseInput.safeParse(raw);
  if (!p.success) return { ok: false, error: 'invalid_input', field: String(p.error.issues[0]?.path[0] ?? '') };
  const v = p.data;
  let orderId: string | null = null;
  if (v.orderId) {
    const [o] = await db.select({ id: orders.id }).from(orders)
      .where(and(eq(orders.id, v.orderId), or(eq(orders.buyerId, userId), eq(orders.sellerId, userId))));
    if (!o) return { ok: false, error: 'invalid_input', field: 'orderId' };
    orderId = o.id;
  }
  // Svindel og betaling får højere prioritet fra start
  const priority: SupportPriority = v.category === 'safety' ? 'high' : 'normal';
  return db.transaction(async (tx) => {
    const [c] = await tx.insert(supportCases).values({
      userId, subject: v.subject, category: v.category, priority, orderId, lastCustomerAt: now, createdAt: now, updatedAt: now
    }).returning({ id: supportCases.id, number: supportCases.number });
    await tx.insert(supportMessages).values({ caseId: c!.id, authorType: 'customer', authorId: userId, body: v.message, createdAt: now });
    return { ok: true as const, id: c!.id, number: c!.number };
  });
}

export interface CustomerCaseRow {
  id: string; number: number; subject: string; category: SupportCategory; status: SupportStatus;
  unread: boolean; updatedAt: Date; createdAt: Date;
}

export async function listCasesForUser(db: Db, userId: string): Promise<CustomerCaseRow[]> {
  return db.select({
    id: supportCases.id, number: supportCases.number, subject: supportCases.subject, category: supportCases.category,
    status: supportCases.status, unread: supportCases.customerUnread, updatedAt: supportCases.updatedAt, createdAt: supportCases.createdAt
  }).from(supportCases).where(eq(supportCases.userId, userId)).orderBy(desc(supportCases.updatedAt)).limit(100);
}

export async function unreadCountForUser(db: Db, userId: string): Promise<number> {
  const [r] = await db.select({ n: count() }).from(supportCases).where(and(eq(supportCases.userId, userId), eq(supportCases.customerUnread, true)));
  return r?.n ?? 0;
}

export interface ThreadMessage {
  id: string; authorType: 'customer' | 'staff' | 'system'; authorName: string | null; body: string; internal: boolean; createdAt: Date;
}

const messageColumns = {
  id: supportMessages.id, authorType: supportMessages.authorType, body: supportMessages.body, internal: supportMessages.internal,
  createdAt: supportMessages.createdAt, staffName: staffUsers.displayName, staffEmail: staffUsers.email
};
type RawMessage = { id: string; authorType: string; body: string; internal: boolean; createdAt: Date; staffName: string | null; staffEmail: string | null };
const toThread = (m: RawMessage, forStaff: boolean): ThreadMessage => ({
  id: m.id, authorType: m.authorType as ThreadMessage['authorType'], body: m.body, internal: m.internal, createdAt: m.createdAt,
  // Kunden ser kun medarbejderens fornavn (aldrig e-mail); medarbejdere ser e-mailen, hvis navnet mangler
  authorName: m.authorType === 'staff' ? (m.staffName ?? (forStaff ? m.staffEmail : null)) : null
});

async function messagesOf(db: Db, caseId: string, includeInternal: boolean): Promise<ThreadMessage[]> {
  const where = includeInternal ? eq(supportMessages.caseId, caseId) : and(eq(supportMessages.caseId, caseId), eq(supportMessages.internal, false));
  const rows = await db.select(messageColumns).from(supportMessages)
    .leftJoin(staffUsers, and(eq(supportMessages.authorType, 'staff'), eq(staffUsers.id, supportMessages.authorId)))
    .where(where).orderBy(asc(supportMessages.createdAt), asc(supportMessages.id));
  return rows.map((m) => toThread(m, includeInternal));
}

export interface CustomerCase extends CustomerCaseRow { messages: ThreadMessage[]; orderId: string | null }

/** Kundens egen sag med samtalen (uden interne noter). Markerer svarene som læst. */
export async function getCaseForUser(db: Db, userId: string, number: number): Promise<CustomerCase | null> {
  if (!Number.isInteger(number) || number < 1 || number > 2_147_483_647) return null;
  const [c] = await db.select({
    id: supportCases.id, number: supportCases.number, subject: supportCases.subject, category: supportCases.category,
    status: supportCases.status, unread: supportCases.customerUnread, updatedAt: supportCases.updatedAt, createdAt: supportCases.createdAt,
    orderId: supportCases.orderId
  }).from(supportCases).where(and(eq(supportCases.userId, userId), eq(supportCases.number, number)));
  if (!c) return null;
  if (c.unread) await db.update(supportCases).set({ customerUnread: false }).where(and(eq(supportCases.id, c.id), eq(supportCases.userId, userId)));
  return { ...c, messages: await messagesOf(db, c.id, false) };
}

/** Kunden svarer. En løst sag åbnes igen; en lukket sag kan ikke besvares (opret en ny). */
export async function addCustomerMessage(db: Db, userId: string, number: number, raw: unknown, now = new Date()): Promise<Result> {
  const p = text(1, MESSAGE_MAX).safeParse(raw);
  if (!p.success) return { ok: false, error: 'invalid_input', field: 'body' };
  return db.transaction(async (tx) => {
    const [c] = await tx.select({ id: supportCases.id, status: supportCases.status }).from(supportCases)
      .where(and(eq(supportCases.userId, userId), eq(supportCases.number, number))).for('update');
    if (!c) return { ok: false as const, error: 'not_found' as const };
    if (c.status === 'closed') return { ok: false as const, error: 'closed' as const };
    await tx.insert(supportMessages).values({ caseId: c.id, authorType: 'customer', authorId: userId, body: p.data, createdAt: now });
    await tx.update(supportCases).set({ status: 'open', lastCustomerAt: now, updatedAt: now, resolvedAt: null })
      .where(and(eq(supportCases.id, c.id), eq(supportCases.userId, userId)));
    return { ok: true as const };
  });
}

/** Kunden markerer selv sagen som løst */
export async function resolveByCustomer(db: Db, userId: string, number: number, now = new Date()): Promise<Result> {
  const r = await db.update(supportCases).set({ status: 'resolved', resolvedAt: now, updatedAt: now })
    .where(and(eq(supportCases.userId, userId), eq(supportCases.number, number), inArray(supportCases.status, ['open', 'pending_customer'])))
    .returning({ id: supportCases.id });
  return r.length ? { ok: true } : { ok: false, error: 'not_found' };
}

/* ------------------------------ Medarbejdere ------------------------------ */

export const QUEUE_VIEWS = ['mine', 'unassigned', 'open', 'pending', 'resolved', 'all'] as const;
export type QueueView = (typeof QUEUE_VIEWS)[number];

export interface StaffCaseRow {
  id: string; number: number; subject: string; category: SupportCategory; status: SupportStatus; priority: SupportPriority;
  customerName: string; customerEmail: string; assigneeId: string | null; assigneeName: string | null;
  lastCustomerAt: Date | null; lastStaffAt: Date | null; updatedAt: Date; createdAt: Date;
  /** Kunden venter på svar (seneste besked er fra kunden, og sagen er åben) */
  waiting: boolean;
}

const OPENISH = ['open', 'pending_customer'] as const;

function viewFilter(view: QueueView, staffId: string): SQL | undefined {
  switch (view) {
    case 'mine': return and(eq(supportCases.assigneeId, staffId), inArray(supportCases.status, [...OPENISH]));
    case 'unassigned': return and(isNull(supportCases.assigneeId), eq(supportCases.status, 'open'));
    case 'open': return eq(supportCases.status, 'open');
    case 'pending': return eq(supportCases.status, 'pending_customer');
    case 'resolved': return inArray(supportCases.status, ['resolved', 'closed']);
    case 'all': return undefined;
  }
}

/** Indbakken. `q` søger i sagsnummer, emne, kundens navn og e-mail (LIKE-tegn escapes). */
export async function listCases(db: Db, opts: { view: QueueView; staffId: string; q?: string; limit?: number }): Promise<StaffCaseRow[]> {
  const where: (SQL | undefined)[] = [viewFilter(opts.view, opts.staffId)];
  const q = normalizeUserText(opts.q ?? '').slice(0, 100);
  if (q) {
    const like = `%${q.replace(/[\\%_]/g, (m) => `\\${m}`)}%`;
    const num = /^#?\d{1,9}$/.test(q) ? Number(q.replace('#', '')) : null;
    where.push(or(ilike(supportCases.subject, like), ilike(users.displayName, like), ilike(users.email, like), ...(num ? [eq(supportCases.number, num)] : [])));
  }
  const assignee = sql<string | null>`(select coalesce(s.display_name, s.email) from ${staffUsers} s where s.id = ${supportCases.assigneeId})`;
  const rows = await db.select({
    id: supportCases.id, number: supportCases.number, subject: supportCases.subject, category: supportCases.category,
    status: supportCases.status, priority: supportCases.priority, customerName: users.displayName, customerEmail: users.email,
    assigneeId: supportCases.assigneeId, assigneeName: assignee, lastCustomerAt: supportCases.lastCustomerAt, lastStaffAt: supportCases.lastStaffAt,
    updatedAt: supportCases.updatedAt, createdAt: supportCases.createdAt
  }).from(supportCases).innerJoin(users, eq(users.id, supportCases.userId))
    .where(and(...where))
    // Haster først, derefter dem der har ventet længst på svar
    .orderBy(sql`case ${supportCases.priority} when 'urgent' then 0 when 'high' then 1 when 'normal' then 2 else 3 end`,
      sql`case when ${supportCases.status} = 'open' then ${supportCases.lastCustomerAt} end asc nulls last`, desc(supportCases.updatedAt))
    .limit(Math.min(opts.limit ?? 100, 200));
  return rows.map((r) => ({ ...r, waiting: r.status === 'open' && !!r.lastCustomerAt && (!r.lastStaffAt || r.lastStaffAt < r.lastCustomerAt) }));
}

export async function queueCounts(db: Db, staffId: string): Promise<Record<'mine' | 'unassigned' | 'open' | 'pending', number>> {
  const [r] = await db.select({
    mine: sql<number>`count(*) filter (where ${supportCases.assigneeId} = ${staffId} and ${supportCases.status} in ('open','pending_customer'))`.mapWith(Number),
    unassigned: sql<number>`count(*) filter (where ${supportCases.assigneeId} is null and ${supportCases.status} = 'open')`.mapWith(Number),
    open: sql<number>`count(*) filter (where ${supportCases.status} = 'open')`.mapWith(Number),
    pending: sql<number>`count(*) filter (where ${supportCases.status} = 'pending_customer')`.mapWith(Number)
  }).from(supportCases);
  return r ?? { mine: 0, unassigned: 0, open: 0, pending: 0 };
}

export interface StaffCase extends StaffCaseRow {
  userId: string; customerUsername: string | null; customerStatus: string; customerSince: Date;
  orderId: string | null; listingId: string | null; listingTitle: string | null; firstResponseAt: Date | null; resolvedAt: Date | null;
  messages: ThreadMessage[];
}

export async function getCase(db: Db, id: string): Promise<StaffCase | null> {
  if (!UUID.test(id)) return null;
  const assignee = sql<string | null>`(select coalesce(s.display_name, s.email) from ${staffUsers} s where s.id = ${supportCases.assigneeId})`;
  const [c] = await db.select({
    id: supportCases.id, number: supportCases.number, subject: supportCases.subject, category: supportCases.category,
    status: supportCases.status, priority: supportCases.priority, customerName: users.displayName, customerEmail: users.email,
    assigneeId: supportCases.assigneeId, assigneeName: assignee, lastCustomerAt: supportCases.lastCustomerAt, lastStaffAt: supportCases.lastStaffAt,
    updatedAt: supportCases.updatedAt, createdAt: supportCases.createdAt, userId: supportCases.userId, customerUsername: users.username,
    customerStatus: users.status, customerSince: users.createdAt, orderId: supportCases.orderId, listingId: supportCases.listingId,
    listingTitle: listings.title, firstResponseAt: supportCases.firstResponseAt, resolvedAt: supportCases.resolvedAt
  }).from(supportCases).innerJoin(users, eq(users.id, supportCases.userId)).leftJoin(listings, eq(listings.id, supportCases.listingId))
    .where(eq(supportCases.id, id));
  if (!c) return null;
  const waiting = c.status === 'open' && !!c.lastCustomerAt && (!c.lastStaffAt || c.lastStaffAt < c.lastCustomerAt);
  return { ...c, waiting, messages: await messagesOf(db, c.id, true) };
}

const replyInput = z.object({
  body: text(1, MESSAGE_MAX),
  internal: z.boolean(),
  /** Status efter svaret. Standard: svar til kunden → "venter på kunden"; intern note → uændret */
  status: z.enum(SUPPORT_STATUSES).optional()
}).strict();

/** Medarbejderen svarer kunden eller skriver en intern note. Første svar til kunden sætter svartiden. */
export async function staffReply(db: Db, staffId: string, caseId: string, raw: unknown, now = new Date()): Promise<Result> {
  if (!UUID.test(caseId)) return { ok: false, error: 'not_found' };
  const p = replyInput.safeParse(raw);
  if (!p.success) return { ok: false, error: 'invalid_input', field: String(p.error.issues[0]?.path[0] ?? 'body') };
  const v = p.data;
  return db.transaction(async (tx) => {
    const [c] = await tx.select({ id: supportCases.id, status: supportCases.status, firstResponseAt: supportCases.firstResponseAt, assigneeId: supportCases.assigneeId })
      .from(supportCases).where(eq(supportCases.id, caseId)).for('update');
    if (!c) return { ok: false as const, error: 'not_found' as const };
    await tx.insert(supportMessages).values({ caseId, authorType: 'staff', authorId: staffId, body: v.body, internal: v.internal, createdAt: now });
    if (v.internal) {
      await tx.update(supportCases).set({ updatedAt: now, ...(v.status ? statusPatch(v.status, now) : {}) }).where(eq(supportCases.id, caseId));
    } else {
      const status = v.status ?? 'pending_customer';
      await tx.update(supportCases).set({
        lastStaffAt: now, updatedAt: now, customerUnread: true, ...statusPatch(status, now),
        ...(c.firstResponseAt ? {} : { firstResponseAt: now }),
        // Den, der svarer en ikke-tildelt sag, overtager den
        ...(c.assigneeId ? {} : { assigneeId: staffId })
      }).where(eq(supportCases.id, caseId));
    }
    return { ok: true as const };
  });
}

const statusPatch = (status: SupportStatus, now: Date) => ({ status, resolvedAt: status === 'resolved' || status === 'closed' ? now : null });

const updateInput = z.object({
  status: z.enum(SUPPORT_STATUSES).optional(),
  priority: z.enum(SUPPORT_PRIORITIES).optional(),
  /** uuid på en aktiv medarbejder, eller null for at fjerne tildelingen */
  assigneeId: z.string().regex(UUID).nullable().optional()
}).strict();

export async function updateCase(db: Db, caseId: string, raw: unknown, now = new Date()): Promise<Result> {
  if (!UUID.test(caseId)) return { ok: false, error: 'not_found' };
  const p = updateInput.safeParse(raw);
  if (!p.success) return { ok: false, error: 'invalid_input', field: String(p.error.issues[0]?.path[0] ?? '') };
  const v = p.data;
  if (v.assigneeId) {
    const [s] = await db.select({ id: staffUsers.id }).from(staffUsers).where(and(eq(staffUsers.id, v.assigneeId), eq(staffUsers.active, true)));
    if (!s) return { ok: false, error: 'invalid_input', field: 'assigneeId' };
  }
  const patch = {
    updatedAt: now,
    ...(v.status ? statusPatch(v.status, now) : {}),
    ...(v.priority ? { priority: v.priority } : {}),
    ...(v.assigneeId !== undefined ? { assigneeId: v.assigneeId } : {})
  };
  const r = await db.update(supportCases).set(patch).where(eq(supportCases.id, caseId)).returning({ id: supportCases.id });
  return r.length ? { ok: true } : { ok: false, error: 'not_found' };
}

/** Kundens øvrige sager (til sidepanelet) */
export async function otherCasesOf(db: Db, userId: string, exceptId: string) {
  return db.select({ id: supportCases.id, number: supportCases.number, subject: supportCases.subject, status: supportCases.status, updatedAt: supportCases.updatedAt })
    .from(supportCases).where(and(eq(supportCases.userId, userId), ne(supportCases.id, exceptId))).orderBy(desc(supportCases.updatedAt)).limit(10);
}

/** Svartid og mængde til oversigten (de seneste `days` dage) */
export async function supportStats(db: Db, since: Date) {
  const [r] = await db.select({
    created: sql<number>`count(*) filter (where ${supportCases.createdAt} >= ${since.toISOString()}::timestamptz)`.mapWith(Number),
    resolved: sql<number>`count(*) filter (where ${supportCases.resolvedAt} >= ${since.toISOString()}::timestamptz)`.mapWith(Number),
    medianFirstResponseMin: sql<number | null>`percentile_cont(0.5) within group (order by extract(epoch from (${supportCases.firstResponseAt} - ${supportCases.createdAt})) / 60) filter (where ${supportCases.firstResponseAt} is not null and ${supportCases.createdAt} >= ${since.toISOString()}::timestamptz)`
  }).from(supportCases);
  return { created: r?.created ?? 0, resolved: r?.resolved ?? 0, medianFirstResponseMin: r?.medianFirstResponseMin == null ? null : Math.round(Number(r.medianFirstResponseMin)) };
}
