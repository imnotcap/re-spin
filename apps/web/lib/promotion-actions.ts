'use server';

import { PgRateLimiter } from '@respin/auth';
import { requireSession } from './auth';
import { getDb, getStripeGatewayOrNull } from './server';
import { startPromotion } from './promotions';

export type PromoteState = { error?: string; checkoutUrl?: string; activated?: boolean } | undefined;

const MESSAGES = {
  invalid_package: 'Vælg en pakke.',
  not_found: 'Annoncen findes ikke.',
  not_active: 'Kun aktive annoncer, der er godkendt, kan fremhæves.',
  payments_unavailable: 'Betaling er ikke slået til endnu. Prøv igen senere.'
} as const;

/** Højst 10 forsøg i timen pr. bruger */
const LIMIT = { capacity: 10, refillPerSecond: 10 / 3600 };

export async function promoteAction(_: PromoteState, fd: FormData): Promise<PromoteState> {
  const current = await requireSession('/konto/annoncer/');
  const db = getDb();
  if (!(await new PgRateLimiter(db, LIMIT).consume(`promote:${current.user.id}`)).allowed) return { error: 'Du har prøvet mange gange. Vent lidt, og prøv igen.' };
  const str = (k: string) => { const v = fd.get(k); return typeof v === 'string' ? v : ''; };
  const r = await startPromotion(db, current.user.id, str('listingId'), str('package'), {
    gateway: getStripeGatewayOrNull(),
    appUrl: process.env.APP_URL ?? 'http://localhost:3000',
    // Uden Stripe: aktivér med det samme i udvikling – i produktion kun hvis det er slået til med vilje
    allowTestActivation: process.env.NODE_ENV !== 'production' || process.env.PROMOTIONS_TEST_MODE === '1'
  });
  if (!r.ok) return { error: MESSAGES[r.error] };
  return 'checkoutUrl' in r ? { checkoutUrl: r.checkoutUrl } : { activated: true };
}
