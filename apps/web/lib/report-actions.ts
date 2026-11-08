'use server';

import { redirect } from 'next/navigation';
import { PgRateLimiter } from '@respin/auth';
import { requireSession } from './auth';
import { getDb } from './server';
import { isReportReason, reportListing } from './report';

/** Højst 10 anmeldelser i døgnet pr. bruger */
const LIMIT = { capacity: 10, refillPerSecond: 10 / 86_400 };
const str = (fd: FormData, k: string) => { const v = fd.get(k); return typeof v === 'string' ? v : ''; };

export async function reportListingAction(fd: FormData): Promise<void> {
  const id = str(fd, 'listingId');
  const back = /^[0-9a-f-]{36}$/.test(id) ? `/annonce/${id}/` : '/';
  const current = await requireSession(back);
  const reason = str(fd, 'reason');
  if (!isReportReason(reason)) redirect(`${back}?anmeld=fejl#anmeld`);
  const db = getDb();
  if (!(await new PgRateLimiter(db, LIMIT).consume(`report:${current.user.id}`)).allowed) redirect(`${back}?anmeld=mange#anmeld`);
  const r = await reportListing(db, current.user.id, id, reason, str(fd, 'text'));
  redirect(`${back}?anmeld=${r === 'ok' || r === 'duplicate' ? 'tak' : 'fejl'}#anmeld`);
}
