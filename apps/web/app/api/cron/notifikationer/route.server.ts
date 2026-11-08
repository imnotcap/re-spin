import { timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';
import { getDb } from '../../../../lib/server';
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

/** Mails om nye beskeder og svar fra kundeservice (se lib/notifications.ts). Køres hvert 5. minut. */
export async function GET(req: Request) {
  if (!authorized(req)) return new NextResponse('Not found', { status: 404 });
  try {
    const { mailer, appUrl } = getNotifier();
    const r = await runNotifications(getDb(), mailer, appUrl);
    return NextResponse.json(r, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e) {
    console.error('cron-fejl', e instanceof Error ? e.message : 'ukendt');
    return NextResponse.json({ error: 'fejl' }, { status: 500, headers: { 'Cache-Control': 'no-store' } });
  }
}
