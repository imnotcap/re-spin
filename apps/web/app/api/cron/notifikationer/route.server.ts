import { timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';
import { runOrderTimers, runOutbox } from '@respin/payments';
import { getDb, getStripeGatewayOrNull } from '../../../../lib/server';
import { runOrderMails } from '../../../../lib/order-mails';
import { getShipmondoOrNull, runShippingLabels } from '../../../../lib/shipping';
import { getNotifier } from '../../../../lib/auth';
import { runNotifications } from '../../../../lib/notifications';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/** Kun Vercel Cron må kalde ruten: "Authorization: Bearer <CRON_SECRET>". Uden CRON_SECRET er ruten slået fra. */
function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret || secret.length < 16) return false;
  const got = Buffer.from(req.headers.get('authorization') ?? '');
  const want = Buffer.from(`Bearer ${secret}`);
  return got.length === want.length && timingSafeEqual(got, want);
}

/**
 * Køres hvert 5. minut:
 *  1. ordrernes frister (udløbet betaling, afsendelsesfrist, antaget levering, automatisk godkendelse)
 *  2. outbox: overførsler til sælgere og refunderinger hos Stripe (idempotente) + fragtlabels hos Shipmondo
 *  3. mails om ordrer, nye beskeder og svar fra kundeservice
 */
export async function GET(req: Request) {
  if (!authorized(req)) return new NextResponse('Not found', { status: 404 });
  try {
    const db = getDb();
    const { mailer, appUrl } = getNotifier();
    const timers = await runOrderTimers(db);
    const gw = getStripeGatewayOrNull();
    const outbox = gw ? await runOutbox(db, gw) : null;
    const shipmondo = getShipmondoOrNull();
    const labels = shipmondo ? await runShippingLabels(db, shipmondo) : null;
    const orderMails = await runOrderMails(db, mailer, appUrl);
    const messages = await runNotifications(db, mailer, appUrl);
    return NextResponse.json({ timers, outbox, labels, orderMails, ...messages }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e) {
    console.error('cron-fejl', e instanceof Error ? e.message : 'ukendt');
    return NextResponse.json({ error: 'fejl' }, { status: 500, headers: { 'Cache-Control': 'no-store' } });
  }
}
