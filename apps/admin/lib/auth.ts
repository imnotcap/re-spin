import 'server-only';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { can, createAuditor, type Permission, type Role } from '@respin/security';
import { createDb, schema, type Db } from '@respin/db';
import { adminEnv } from './env';
import { getGuard } from './guard';

export interface Staff { id: string; email: string; role: Role; ip: string | null }

const g = globalThis as unknown as { __adminDb?: Db };
function db(): Db | null {
  const url = adminEnv().DATABASE_URL;
  if (!url) return null;
  return (g.__adminDb ??= createDb({ url, max: 5 }).db);
}

/** Audit-log: i produktion til databasen (append-only tabel); i dev uden database til konsollen. */
const auditor = createAuditor({
  async write(event) {
    const d = db();
    if (!d) { console.warn('[audit]', JSON.stringify(event)); return; }
    await d.insert(schema.auditLog).values({ ...event, metadata: event.metadata ?? {} });
  }
});
export const audit = auditor.record;

async function lookupStaff(email: string): Promise<{ id: string; role: Role } | null> {
  const e = adminEnv();
  const d = db();
  if (!d) return e.NODE_ENV !== 'production' && e.ADMIN_DEV_EMAIL?.toLowerCase() === email ? { id: 'dev', role: e.ADMIN_DEV_ROLE } : null;
  const [row] = await d.select({ id: schema.staffUsers.id, role: schema.staffUsers.role, active: schema.staffUsers.active }).from(schema.staffUsers).where(eq(schema.staffUsers.email, email));
  return row && row.active ? { id: row.id, role: row.role } : null; // spærrede medarbejdere mister adgang med det samme
}

/**
 * KALD DENNE i hver side og route handler der viser data eller ændrer noget. Den genverificerer hele adgangskæden
 * (host → IP → Access-JWT → aktiv medarbejder → rettighed) uafhængigt af proxy.ts, og logger afvisninger.
 * Afviste svar er 404 (afslører ikke hvad der findes).
 */
export async function requireStaff(permission?: Permission): Promise<Staff> {
  const h = await headers();
  const result = await getGuard()(h);
  if (!result.ok) { await audit({ actorType: 'system', action: 'admin.denied', metadata: { reason: result.reason, ip: h.get('cf-connecting-ip') } }); notFound(); }
  const staff = await lookupStaff(result.identity.email);
  if (!staff) { await audit({ actorType: 'system', action: 'admin.unknown_staff', ip: result.ip, metadata: { email: result.identity.email } }); notFound(); }
  if (permission && !can(staff.role, permission)) {
    await audit({ actorType: 'staff', actorId: staff.id, action: 'admin.forbidden', ip: result.ip, metadata: { permission } });
    notFound();
  }
  return { id: staff.id, email: result.identity.email, role: staff.role, ip: result.ip };
}
