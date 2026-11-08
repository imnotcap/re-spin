'use server';

import { PgRateLimiter } from '@respin/auth';
import { requireSession } from './auth';
import { getDb, getStripeGatewayOrNull } from './server';
import { startProfilePromotion, startPromotion, type PromoteError } from './promotions';

export type PromoteState = { error?: string; checkoutUrl?: string; activated?: boolean } | undefined;

const MESSAGES: Record<PromoteError, string> = {
  invalid_package: 'Vælg en pakke.',
  not_found: 'Annoncen findes ikke.',
  not_active: 'Kun aktive annoncer, der er godkendt, kan fremhæves.',
  no_listings: 'Du skal have mindst én vare til salg for at fremhæve din profil.',
  payments_unavailable: 'Betaling er ikke slået til endnu. Prøv igen senere.'
};

/** Højst 10 forsøg i timen pr. bruger */
const LIMIT = { capacity: 10, refillPerSecond: 10 / 3600 };

/** Fremhæv en annonce (`listingId`) eller sin profil (`kind=profile`). Prisen vælges altid af serveren. */
export async function promoteAction(_: PromoteState, fd: FormData): Promise<PromoteState> {
  const str = (k: string) => { const v = fd.get(k); return typeof v === 'string' ? v : ''; };
  const profile = str('kind') === 'profile';
  const current = await requireSession(profile ? '/konto/fremhaev-profil/' : '/konto/annoncer/');
  const db = getDb();
  if (!(await new PgRateLimiter(db, LIMIT).consume(`promote:${current.user.id}`)).allowed) return { error: 'Du har prøvet mange gange. Vent lidt, og prøv igen.' };
  const deps = {
    gateway: getStripeGatewayOrNull(),
    appUrl: process.env.APP_URL ?? 'http://localhost:3000',
    // Uden Stripe: aktivér med det samme i udvikling – i produktion kun hvis det er slået til med vilje
    allowTestActivation: process.env.NODE_ENV !== 'production' || process.env.PROMOTIONS_TEST_MODE === '1'
  };
  const r = profile
    ? await startProfilePromotion(db, current.user.id, str('package'), deps)
    : await startPromotion(db, current.user.id, str('listingId'), str('package'), deps);
  if (!r.ok) return { error: MESSAGES[r.error] };
  return 'checkoutUrl' in r ? { checkoutUrl: r.checkoutUrl } : { activated: true };
}
