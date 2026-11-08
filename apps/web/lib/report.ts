import 'server-only';
import { and, eq } from 'drizzle-orm';
import { schema, type Db } from '@respin/db';
import { normalizeUserText } from '@respin/core';

const { reports, listings } = schema;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/** Grunde, man kan vælge, når man anmelder en annonce (vises i admin som "grund: tekst") */
export const REPORT_REASONS = {
  forbidden: 'Forbudt vare (fx våben, medicin, falske varer)',
  scam: 'Svindel eller betaling uden om Videro',
  misleading: 'Vildledende billeder eller beskrivelse',
  offensive: 'Stødende indhold',
  wrong_category: 'Forkert kategori',
  other: 'Andet'
} as const;
export type ReportReason = keyof typeof REPORT_REASONS;
export const isReportReason = (v: string): v is ReportReason => Object.hasOwn(REPORT_REASONS, v);

/** Anmeld en annonce. Ikke sin egen, og ikke den samme annonce to gange, mens den første anmeldelse er åben. */
export async function reportListing(db: Db, reporterId: string, listingId: string, reason: ReportReason, text: string): Promise<'ok' | 'not_found' | 'own' | 'duplicate'> {
  if (!UUID.test(listingId)) return 'not_found';
  const [l] = await db.select({ sellerId: listings.sellerId }).from(listings).where(eq(listings.id, listingId));
  if (!l) return 'not_found';
  if (l.sellerId === reporterId) return 'own';
  const [dupe] = await db.select({ id: reports.id }).from(reports)
    .where(and(eq(reports.reporterId, reporterId), eq(reports.targetId, listingId), eq(reports.status, 'open'))).limit(1);
  if (dupe) return 'duplicate';
  const note = normalizeUserText(text).slice(0, 500);
  await db.insert(reports).values({ reporterId, targetType: 'listing', targetId: listingId, reason: `${reason}${note ? `: ${note}` : ''}` });
  return 'ok';
}
