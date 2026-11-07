import 'server-only';
import { z } from 'zod';
import { loadEnv } from '@respin/security';
import { createDb, type Db } from '@respin/db';
import { createStripe, stripeGateway, type StripeGateway } from '@respin/payments';

const g = globalThis as unknown as { __respinDb?: Db; __respinGw?: StripeGateway };

/** Database (lazy; konfiguration valideres første gang den bruges, ikke ved build) */
export function getDb(): Db {
  if (!g.__respinDb) {
    const env = loadEnv(z.object({ DATABASE_URL: z.string().min(10), DB_POOL_MAX: z.coerce.number().int().min(1).max(50).default(10) }));
    g.__respinDb = createDb({ url: env.DATABASE_URL, max: env.DB_POOL_MAX }).db;
  }
  return g.__respinDb;
}

export function getStripeGateway(): StripeGateway {
  if (!g.__respinGw) {
    const env = loadEnv(z.object({ STRIPE_SECRET_KEY: z.string().regex(/^(sk|rk)_(test|live)_/), STRIPE_WEBHOOK_SECRET: z.string().startsWith('whsec_') }));
    g.__respinGw = stripeGateway(createStripe(env.STRIPE_SECRET_KEY), env.STRIPE_WEBHOOK_SECRET);
  }
  return g.__respinGw;
}

/** Stripe, hvis nøglerne er sat – ellers null (fx i udvikling eller før betaling er slået til) */
export function getStripeGatewayOrNull(): StripeGateway | null {
  if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET) return null;
  try { return getStripeGateway(); } catch { return null; }
}
