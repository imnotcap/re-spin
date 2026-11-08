import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { schema, type Db } from '@respin/db';
import { createTestDb } from '@respin/db/testing';
import { addCustomerMessage, createCase, getCase, getCaseForUser, listCases, listCasesForUser, queueCounts, resolveByCustomer, staffReply, unreadCountForUser, updateCase } from './index';

let db: Db, close: () => Promise<void>;
beforeAll(async () => { ({ db, close } = await createTestDb()); });
afterAll(async () => { await close(); });

let k = 0;
async function user(name = 'Kunde') {
  const i = ++k;
  const [u] = await db.insert(schema.users).values({ email: `k${i}@x.dk`, emailNormalized: `k${i}@x.dk`, displayName: `${name} ${i}` }).returning();
  return u!.id;
}
async function staff(name: string | null = 'Signe') {
  const i = ++k;
  const [s] = await db.insert(schema.staffUsers).values({ email: `s${i}@videro.dk`, role: 'support', displayName: name }).returning();
  return s!.id;
}
const MSG = 'Min pakke er ikke kommet frem endnu.';

describe('kunden', () => {
  it('opretter en sag med første besked; sagsnummer starter ved 1001+', async () => {
    const me = await user();
    const r = await createCase(db, me, { subject: 'Pakke mangler', category: 'order', message: MSG });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.number).toBeGreaterThanOrEqual(1001);
    const c = await getCaseForUser(db, me, r.number);
    expect(c).toMatchObject({ subject: 'Pakke mangler', status: 'open' });
    expect(c!.messages.map((m) => [m.authorType, m.body])).toEqual([['customer', MSG]]);
  });

  it('afviser ugyldigt input, fremmede ordrer og ekstra felter', async () => {
    const me = await user();
    expect(await createCase(db, me, { subject: 'x', category: 'order', message: MSG })).toMatchObject({ ok: false, field: 'subject' });
    expect(await createCase(db, me, { subject: 'Hej der', category: 'hack', message: MSG })).toMatchObject({ ok: false, field: 'category' });
    expect(await createCase(db, me, { subject: 'Hej der', category: 'order', message: 'kort' })).toMatchObject({ ok: false, field: 'message' });
    expect(await createCase(db, me, { subject: 'Hej der', category: 'order', message: MSG, orderId: crypto.randomUUID() })).toMatchObject({ ok: false, field: 'orderId' });
    expect((await createCase(db, me, { subject: 'Hej der', category: 'order', message: MSG, userId: crypto.randomUUID() })).ok).toBe(false);
  });

  it('kan ikke se, svare på eller lukke andres sager (IDOR) – og ser aldrig interne noter', async () => {
    const a = await user(), b = await user(), s = await staff();
    const r = await createCase(db, a, { subject: 'Konto spærret', category: 'account', message: MSG });
    if (!r.ok) throw new Error();
    expect(await getCaseForUser(db, b, r.number)).toBeNull();
    expect(await addCustomerMessage(db, b, r.number, 'Hej')).toEqual({ ok: false, error: 'not_found' });
    expect(await resolveByCustomer(db, b, r.number)).toEqual({ ok: false, error: 'not_found' });
    expect((await listCasesForUser(db, b)).length).toBe(0);
    await staffReply(db, s, r.id, { body: 'Kunden har to konti – tjek', internal: true });
    await staffReply(db, s, r.id, { body: 'Hej! Vi kigger på det.', internal: false });
    const seen = await getCaseForUser(db, a, r.number);
    expect(seen!.messages.map((m) => m.body)).toEqual([MSG, 'Hej! Vi kigger på det.']);
    expect(seen!.messages[1]!.authorName).toBe('Signe');
  });

  it('svar markeres ulæst for kunden og læst, når sagen åbnes; svar fra kunden genåbner', async () => {
    const me = await user(), s = await staff();
    const r = await createCase(db, me, { subject: 'Refundering', category: 'payment', message: MSG });
    if (!r.ok) throw new Error();
    await staffReply(db, s, r.id, { body: 'Er pengene kommet?', internal: false });
    expect(await unreadCountForUser(db, me)).toBe(1);
    expect((await getCaseForUser(db, me, r.number))!.status).toBe('pending_customer');
    expect(await unreadCountForUser(db, me)).toBe(0);
    expect(await addCustomerMessage(db, me, r.number, 'Nej, ikke endnu')).toEqual({ ok: true });
    expect((await getCase(db, r.id))!.status).toBe('open');
    expect(await resolveByCustomer(db, me, r.number)).toEqual({ ok: true });
    expect(await addCustomerMessage(db, me, r.number, 'Nu er de kommet')).toEqual({ ok: true }); // løst → genåbnes
    await updateCase(db, r.id, { status: 'closed' });
    expect(await addCustomerMessage(db, me, r.number, 'Hallo?')).toEqual({ ok: false, error: 'closed' });
  });
});

describe('medarbejdere', () => {
  it('indbakke: ikke tildelte, mine og søgning; første svar sætter svartid og overtager sagen', async () => {
    const me = await user('Mads'), s = await staff('Jonas');
    const r = await createCase(db, me, { subject: 'Svindel i beskeder', category: 'safety', message: MSG });
    if (!r.ok) throw new Error();
    const un = await listCases(db, { view: 'unassigned', staffId: s });
    expect(un.find((c) => c.id === r.id)).toMatchObject({ priority: 'high', waiting: true });
    expect((await listCases(db, { view: 'all', staffId: s, q: `#${r.number}` })).map((c) => c.id)).toEqual([r.id]);
    expect((await listCases(db, { view: 'all', staffId: s, q: '100%_' })).length).toBe(0); // LIKE-tegn escapes
    await staffReply(db, s, r.id, { body: 'Tak – vi har spærret brugeren.', internal: false });
    const c = await getCase(db, r.id);
    expect(c).toMatchObject({ assigneeId: s, status: 'pending_customer', waiting: false });
    expect(c!.firstResponseAt).not.toBeNull();
    expect((await listCases(db, { view: 'mine', staffId: s })).map((x) => x.id)).toContain(r.id);
    expect((await queueCounts(db, s)).mine).toBeGreaterThanOrEqual(1);
  });

  it('tildeling kun til aktive medarbejdere; ukendte felter og id afvises', async () => {
    const me = await user(), s = await staff(), gone = await staff('Tidligere');
    await db.update(schema.staffUsers).set({ active: false }).where(eq(schema.staffUsers.id, gone));
    const r = await createCase(db, me, { subject: 'Annonce fjernet', category: 'listing', message: MSG });
    if (!r.ok) throw new Error();
    expect(await updateCase(db, r.id, { assigneeId: gone })).toMatchObject({ ok: false, field: 'assigneeId' });
    expect(await updateCase(db, r.id, { assigneeId: s, priority: 'urgent' })).toEqual({ ok: true });
    expect(await updateCase(db, r.id, { userId: s })).toMatchObject({ ok: false });
    expect(await updateCase(db, 'x', { status: 'open' })).toEqual({ ok: false, error: 'not_found' });
  });

  it('beskeder kan ikke redigeres bagefter (databasen afviser)', async () => {
    const me = await user();
    const r = await createCase(db, me, { subject: 'Test af log', category: 'other', message: MSG });
    if (!r.ok) throw new Error();
    await expect(db.update(schema.supportMessages).set({ body: 'ændret' }).where(eq(schema.supportMessages.caseId, r.id))).rejects.toThrow();
  });
});
