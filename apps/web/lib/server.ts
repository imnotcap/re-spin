import 'server-only';
import { z } from 'zod';
import { loadEnv } from '@respin/security';
import { createDb, type Db } from '@respin/db';
import { createStripe, stripeGateway, type StripeGateway } from '@respin/payments';

const envSchema = z.object({
  DATABASE_URL: z.string().min(10),
  STRIPE_SECRET_KEY: z.string().regex(/^(sk|rk)_(test|live)_/),
  STRIPE_WEBHOOK_SECRET: z.string().startsWith('whsec_')
});

interface Services { db: Db; gateway: StripeGateway }
const g = globalThis as unknown as { __respin?: Services };

/** Lazy og cachet: konfigurationen valideres første gang den bruges (ikke ved build), og appen nægter at køre med ugyldig konfiguration. */
export function getServices(): Services {
  if (!g.__respin) {
    const env = loadEnv(envSchema);
    g.__respin = { db: createDb({ url: env.DATABASE_URL }).db, gateway: stripeGateway(createStripe(env.STRIPE_SECRET_KEY), env.STRIPE_WEBHOOK_SECRET) };
  }
  return g.__respin;
}
