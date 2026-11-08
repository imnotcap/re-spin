import { NextResponse } from 'next/server';
import { MemoryRateLimiter } from '@respin/security';
import { getDb } from '../../../lib/server';
import { requestContext } from '../../../lib/auth';
import { BOT, eventInput, recordEvent } from '../../../lib/analytics-server';

/** Højst 60 hændelser i træk og ét pr. sekund derefter pr. IP (pr. server-instans) */
const limiter = new MemoryRateLimiter({ capacity: 60, refillPerSecond: 1 });
const none = () => new NextResponse(null, { status: 204, headers: { 'Cache-Control': 'no-store' } });

/**
 * Statistik uden cookies (sendes med navigator.sendBeacon). Svarer altid 204 – også ved afvisning – så siden
 * aldrig mærker noget, og ingen kan bruge svaret til at teste filtrene. Der sættes ingen cookies.
 */
export async function POST(req: Request) {
  try {
    const raw = await req.text();
    if (raw.length > 2048) return none();
    const ctx = await requestContext();
    const ua = (ctx.userAgent ?? '').slice(0, 400);
    if (!ua || BOT.test(ua)) return none();
    if (!(await limiter.consume(`e:${ctx.ip ?? 'ukendt'}`)).allowed) return none();
    const parsed = eventInput.safeParse(JSON.parse(raw));
    if (!parsed.success) return none();
    await recordEvent(getDb(), parsed.data, { ip: ctx.ip ?? null, userAgent: ua });
  } catch (e) {
    console.error('statistik-fejl', e instanceof Error ? e.message : 'ukendt');
  }
  return none();
}
