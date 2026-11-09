'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { PgRateLimiter } from '@respin/auth';
import { applyOrderEvent, startOrderCheckout } from '@respin/payments';
import { createCase } from '@respin/support';
import { requireSession } from './auth';
import { getDb, getStripeGatewayOrNull } from './server';
import { USER_EVENTS, type UserEvent } from './orders';
import { onboardingLink, simulateVerified, stripeDashboardLink } from './payouts';

const str = (fd: FormData, k: string) => { const v = fd.get(k); return typeof v === 'string' ? v : ''; };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const appUrl = () => process.env.APP_URL ?? 'http://localhost:3000';
/** Uden Stripe-nøgler kan betaling og ID-kontrol simuleres – men ALDRIG i produktion */
const canSimulate = () => process.env.NODE_ENV !== 'production';

/** Højst 10 købsforsøg i timen pr. bruger */
const BUY_LIMIT = { capacity: 10, refillPerSecond: 10 / 3600 };

/** Køb nu → Stripe Checkout (eller simuleret betaling i udvikling) */
export async function buyAction(fd: FormData): Promise<void> {
  const listingId = str(fd, 'listingId');
  const back = UUID.test(listingId) ? `/annonce/${listingId}/` : '/';
  const current = await requireSession(back);
  const db = getDb();
  if (!(await new PgRateLimiter(db, BUY_LIMIT).consume(`buy:${current.user.id}`)).allowed) redirect(`${back}?betaling=for-mange`);
  const gw = getStripeGatewayOrNull();
  const r = await startOrderCheckout(db, gw, { buyerId: current.user.id, buyerEmail: current.user.email, listingId, appUrl: appUrl(), simulate: !gw && canSimulate() });
  if (!r.ok) redirect(`${back}?betaling=${r.reason}`);
  if ('checkoutUrl' in r) redirect(r.checkoutUrl);
  redirect(`/konto/ordrer/${r.orderId}/?betalt=1`);
}

/** Køber/sælger udløser en handling på ordren. Tilstandsmaskinen afviser alt, der ikke er tilladt. */
export async function orderAction(fd: FormData): Promise<void> {
  const orderId = str(fd, 'orderId');
  const event = str(fd, 'event') as UserEvent;
  const back = UUID.test(orderId) ? `/konto/ordrer/${orderId}/` : '/konto/ordrer/';
  const current = await requireSession(back);
  if (!(USER_EVENTS as readonly string[]).includes(event)) redirect(`${back}?fejl=handling`);
  const actor = event.startsWith('buyer') ? 'buyer' : 'seller';
  const db = getDb();
  let caseNumber: number | null = null;
  if (event === 'buyer_dispute') {
    const reason = str(fd, 'reason').trim();
    if (reason.length < 10) redirect(`${back}?fejl=begrundelse`);
    const c = await createCase(db, current.user.id, { subject: 'Problem med en ordre', category: 'order', message: reason.slice(0, 4000), orderId });
    if (c.ok) caseNumber = c.number;
  }
  const r = await applyOrderEvent(db, {
    orderId, event, actor, actorId: current.user.id,
    shipment: event === 'seller_ship' ? { carrier: str(fd, 'carrier').trim(), trackingNumber: str(fd, 'tracking').trim() } : undefined,
    metadata: caseNumber ? { supportCase: caseNumber } : {}
  });
  revalidatePath(back);
  redirect(`${back}?${r.ok ? `ok=${event}` : 'fejl=status'}`);
}

/** Opret/fortsæt udbetalingskonto hos Stripe (ID-kontrol og bankkonto sker på Stripes side) */
export async function payoutOnboardingAction(): Promise<void> {
  const current = await requireSession('/konto/udbetalinger/');
  const db = getDb();
  const gw = getStripeGatewayOrNull();
  if (!gw) {
    if (!canSimulate()) redirect('/konto/udbetalinger/?fejl=betaling');
    await simulateVerified(db, current.user.id);
    redirect('/konto/udbetalinger/?retur=1');
  }
  const r = await onboardingLink(db, gw, current.user.id, appUrl());
  if (!r.ok) redirect('/konto/udbetalinger/?fejl=konto');
  redirect(r.url);
}

export async function payoutDashboardAction(): Promise<void> {
  const current = await requireSession('/konto/udbetalinger/');
  const gw = getStripeGatewayOrNull();
  const url = gw ? await stripeDashboardLink(getDb(), gw, current.user.id) : null;
  redirect(url ?? '/konto/udbetalinger/?fejl=oversigt');
}
