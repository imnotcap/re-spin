'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { PgRateLimiter } from '@respin/auth';
import { addCustomerMessage, createCase, resolveByCustomer } from '@respin/support';
import { requireSession } from './auth';
import { getDb } from './server';

export type SupportFormState = { error?: string; field?: string; sent?: number } | undefined;

/** Højst 5 nye henvendelser i timen og 30 beskeder pr. 10 minutter pr. bruger */
const CREATE_LIMIT = { capacity: 5, refillPerSecond: 5 / 3600 };
const REPLY_LIMIT = { capacity: 30, refillPerSecond: 30 / 600 };

const FIELD: Record<string, string> = {
  subject: 'Skriv en kort overskrift på 3–120 tegn.',
  category: 'Vælg, hvad det handler om.',
  message: 'Beskriv det med mindst 10 tegn (højst 4.000).',
  orderId: 'Vælg en af dine egne ordrer.',
  body: 'Skriv en besked (højst 4.000 tegn).'
};
const str = (fd: FormData, k: string) => { const v = fd.get(k); return typeof v === 'string' ? v : ''; };
const caseNumber = (fd: FormData) => { const n = Number(str(fd, 'nr')); return Number.isInteger(n) ? n : -1; };

export async function createCaseAction(_: SupportFormState, fd: FormData): Promise<SupportFormState> {
  const current = await requireSession('/konto/support/ny/');
  const db = getDb();
  if (!(await new PgRateLimiter(db, CREATE_LIMIT).consume(`support-new:${current.user.id}`)).allowed) return { error: 'Du har oprettet mange henvendelser på kort tid. Skriv gerne videre i en af dem.' };
  const r = await createCase(db, current.user.id, { subject: str(fd, 'subject'), category: str(fd, 'category'), message: str(fd, 'message'), orderId: str(fd, 'orderId') });
  if (!r.ok) return { field: r.field, error: (r.field && FIELD[r.field]) || 'Tjek felterne, og prøv igen.' };
  redirect(`/konto/support/${r.number}/?ny=1`);
}

export async function replyAction(_: SupportFormState, fd: FormData): Promise<SupportFormState> {
  const nr = caseNumber(fd);
  const current = await requireSession(`/konto/support/${nr > 0 ? `${nr}/` : ''}`);
  const db = getDb();
  if (!(await new PgRateLimiter(db, REPLY_LIMIT).consume(`support-msg:${current.user.id}`)).allowed) return { error: 'Du har sendt mange beskeder lige nu. Vent lidt, og prøv igen.' };
  const r = await addCustomerMessage(db, current.user.id, nr, str(fd, 'body'));
  if (!r.ok) return { error: r.error === 'closed' ? 'Sagen er lukket. Opret en ny henvendelse, hvis du stadig har brug for hjælp.' : r.error === 'not_found' ? 'Sagen findes ikke.' : FIELD.body, field: 'body' };
  revalidatePath(`/konto/support/${nr}/`);
  return { sent: Date.now() };
}

export async function resolveAction(fd: FormData): Promise<void> {
  const nr = caseNumber(fd);
  const current = await requireSession('/konto/support/');
  await resolveByCustomer(getDb(), current.user.id, nr);
  revalidatePath(`/konto/support/${nr}/`);
  redirect(`/konto/support/${nr}/?loest=1`);
}
