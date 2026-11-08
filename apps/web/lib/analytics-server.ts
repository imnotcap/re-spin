import 'server-only';
import { createHash, randomBytes } from 'node:crypto';
import { lt, ne, sql } from 'drizzle-orm';
import { z } from 'zod';
import { schema, type Db } from '@respin/db';

const { analyticsEvents, analyticsSalts } = schema;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const clean = (max: number) => z.string().transform((s) => s.normalize('NFC').replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, max));

export const eventInput = z.object({
  t: z.enum(['pageview', 'listing_view', 'click', 'search', 'favorite', 'share']),
  p: z.string().max(400).regex(/^\//).transform((s) => s.slice(0, 200)),
  r: z.string().max(200).regex(/^[a-z0-9.-]+$/i).transform((s) => s.toLowerCase().slice(0, 100)).optional(),
  listingId: z.string().regex(UUID).optional(),
  category: z.string().max(40).regex(/^[a-z]+$/).optional(),
  value: clean(100).optional(),
  num: z.number().int().min(-1).max(100_000).optional()
});
export type EventInput = z.infer<typeof eventInput>;

/** Bots, link-forhåndsvisninger og målinger (Lighthouse) tælles ikke */
export const BOT = /bot|crawl|spider|slurp|lighthouse|headless|preview|facebookexternalhit|embedly|whatsapp|discord|slack|telegram|curl|wget|python|node-fetch|axios|monitor|uptime|vercel/i;

export function deviceOf(ua: string): 'mobile' | 'tablet' | 'desktop' {
  if (/ipad|tablet|kindle|silk|playbook|(android(?!.*mobile))/i.test(ua)) return 'tablet';
  if (/mobi|iphone|ipod|android|windows phone/i.test(ua)) return 'mobile';
  return 'desktop';
}

const dayKey = (d = new Date()) => d.toLocaleDateString('sv-SE', { timeZone: 'Europe/Copenhagen' }); // YYYY-MM-DD
const g = globalThis as unknown as { __videroSalt?: { day: string; salt: string } };

/**
 * Dagens tilfældige salt (fælles for alle server-instanser via databasen). Når dagen skifter, slettes gamle salte,
 * så gårsdagens hashes ikke kan genskabes – og hændelser ældre end 13 måneder slettes.
 */
async function todaysSalt(db: Db): Promise<string> {
  const day = dayKey();
  if (g.__videroSalt?.day === day) return g.__videroSalt.salt;
  await db.insert(analyticsSalts).values({ day, salt: randomBytes(32).toString('hex') }).onConflictDoNothing();
  const [row] = await db.select({ salt: analyticsSalts.salt }).from(analyticsSalts).where(sql`${analyticsSalts.day} = ${day}`);
  await db.delete(analyticsSalts).where(ne(analyticsSalts.day, day));
  await db.delete(analyticsEvents).where(lt(analyticsEvents.at, new Date(Date.now() - 400 * 86_400_000)));
  g.__videroSalt = { day, salt: row!.salt };
  return row!.salt;
}

/** Unik besøgende samme dag: hash af salt + IP + browser. IP'en gemmes aldrig. */
export const visitorHash = (salt: string, ip: string, ua: string) => createHash('sha256').update(`${salt}|${ip}|${ua}`).digest('hex').slice(0, 16);

export async function recordEvent(db: Db, e: EventInput, ctx: { ip: string | null; userAgent: string }): Promise<void> {
  const salt = await todaysSalt(db);
  await db.insert(analyticsEvents).values({
    type: e.t, path: e.p, listingId: e.listingId ?? null, category: e.category ?? null, value: e.value || null, num: e.num ?? null,
    referrerHost: e.r ?? null, device: deviceOf(ctx.userAgent), visitor: ctx.ip ? visitorHash(salt, ctx.ip, ctx.userAgent) : null
  });
}
