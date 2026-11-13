'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { PgRateLimiter } from '@respin/auth';
import { requireSession } from './auth';
import { getDb } from './server';
import { parseKr } from './listing-labels';
import { findConversation, makeOffer, respondToOffer, sendFirstMessage, sendMessage } from './conversations';
import { checkMessage, checkNewConversation } from './spam';
import { notifyAfterMessage } from './message-notify';

/** Højst 20 bud i døgnet pr. bruger (beskeder og nye samtaler: se lib/spam.ts) */
const OFFER_LIMIT = { capacity: 20, refillPerSecond: 20 / 86_400 };

const str = (fd: FormData, k: string) => { const v = fd.get(k); return typeof v === 'string' ? v : ''; };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export type ChatState = { error?: string; sent?: number } | undefined;

const MESSAGE_ERRORS: Record<string, string> = {
  invalid_body: 'Skriv en besked på højst 2.000 tegn.', not_found: 'Samtalen findes ikke.',
  duplicate: 'Du har sendt den samme besked til mange sælgere. Skriv en personlig besked.',
  not_for_sale: 'Varen er ikke til salg længere.', own_listing: 'Du kan ikke skrive til dig selv om din egen vare.'
};

/** Første besked til sælgeren om en annonce → samtalen oprettes og åbnes */
export async function firstMessageAction(_: ChatState, fd: FormData): Promise<ChatState> {
  const listingId = str(fd, 'listingId');
  const current = await requireSession(UUID.test(listingId) ? `/konto/beskeder/ny/${listingId}/` : '/');
  const db = getDb();
  const limited = await checkMessage(db, current.user.id) ?? (await findConversation(db, current.user.id, listingId) ? null : await checkNewConversation(db, current.user.id));
  if (limited) return { error: limited };
  const r = await sendFirstMessage(db, current.user.id, listingId, str(fd, 'body'));
  if (!r.ok) return { error: MESSAGE_ERRORS[r.error] ?? 'Beskeden kunne ikke sendes.' };
  notifyAfterMessage(r.id, current.user.id);
  redirect(`/konto/beskeder/${r.id}/`);
}

export async function sendMessageAction(_: ChatState, fd: FormData): Promise<ChatState> {
  const id = str(fd, 'conversationId');
  const current = await requireSession(`/konto/beskeder/${UUID.test(id) ? `${id}/` : ''}`);
  const db = getDb();
  const limited = await checkMessage(db, current.user.id);
  if (limited) return { error: limited };
  const r = await sendMessage(db, current.user.id, id, str(fd, 'body'));
  if (!r.ok) return { error: MESSAGE_ERRORS[r.error] ?? 'Beskeden kunne ikke sendes.' };
  notifyAfterMessage(id, current.user.id);
  revalidatePath(`/konto/beskeder/${id}/`);
  return { sent: Date.now() };
}

const OFFER_ERRORS: Record<string, string> = {
  invalid_amount: 'Buddet skal være mindst 40 % af prisen og lavere end prisen.',
  offer_exists: 'Du har allerede et åbent bud på varen. Træk det tilbage, eller vent på svar.',
  not_for_sale: 'Varen er ikke til salg længere.', own_listing: 'Du kan ikke byde på din egen vare.', not_found: 'Varen findes ikke.'
};

export type OfferState = { error?: string } | undefined;

export async function makeOfferAction(_: OfferState, fd: FormData): Promise<OfferState> {
  const listingId = str(fd, 'listingId');
  const current = await requireSession(UUID.test(listingId) ? `/annonce/${listingId}/` : '/');
  const amount = parseKr(str(fd, 'amount'));
  if (amount === null) return { error: 'Skriv et beløb, fx 350.' };
  const db = getDb();
  if (!(await new PgRateLimiter(db, OFFER_LIMIT).consume(`offer:${current.user.id}`)).allowed) return { error: 'Du har givet mange bud i dag. Prøv igen i morgen.' };
  if (!(await findConversation(db, current.user.id, listingId))) {
    const limited = await checkNewConversation(db, current.user.id);
    if (limited) return { error: limited };
  }
  const r = await makeOffer(db, current.user.id, listingId, amount);
  if (!r.ok) return { error: OFFER_ERRORS[r.error] ?? 'Buddet kunne ikke gives.' };
  notifyAfterMessage(r.conversationId, current.user.id);
  redirect(`/konto/beskeder/${r.conversationId}/?bud=1`);
}

/** Accepter/afvis (sælger) eller træk tilbage (køber) */
export async function offerResponseAction(fd: FormData): Promise<void> {
  const current = await requireSession('/konto/beskeder/');
  const action = str(fd, 'action');
  if (action !== 'accept' && action !== 'decline' && action !== 'withdraw') redirect('/konto/beskeder/');
  const r = await respondToOffer(getDb(), current.user.id, str(fd, 'offerId'), action);
  if (r.ok) notifyAfterMessage(r.conversationId, current.user.id);
  const back = UUID.test(str(fd, 'conversationId')) ? `/konto/beskeder/${str(fd, 'conversationId')}/` : '/konto/beskeder/';
  redirect(`${back}?${r.ok ? `ok=${action}` : 'fejl=bud'}`);
}
