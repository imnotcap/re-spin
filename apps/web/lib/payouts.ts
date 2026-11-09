import 'server-only';
/**
 * Sælgerens udbetalingskonto hos Stripe (Express). Stripe står for ID-kontrol (KYC efter hvidvaskloven),
 * sanktionstjek og bankkonto på sin egen side – Videro ser og gemmer kun status, aldrig legitimation eller CPR.
 */
import { and, eq, inArray, sql } from 'drizzle-orm';
import { schema, type Db } from '@respin/db';
import { applyAccountState, type StripeGateway } from '@respin/payments';

const { sellerProfiles, users, orders } = schema;

export interface PayoutStatus {
  hasAccount: boolean;
  payoutsEnabled: boolean;
  kycStatus: 'none' | 'pending' | 'verified' | 'rejected';
  requirements: string[];
  disabledReason: string | null;
  /** Gennemførte salg, der venter på, at kontoen bliver klar (øre) */
  waitingOre: number;
  /** Penge i solgte ordrer, der endnu ikke er frigivet (betalt → leveret) */
  inProgressOre: number;
  /** Udbetalt i alt via Stripe (øre) */
  paidOutOre: number;
}

export async function payoutStatus(db: Db, userId: string): Promise<PayoutStatus> {
  const [p] = await db.select().from(sellerProfiles).where(eq(sellerProfiles.userId, userId));
  const [sums] = await db.select({
    waiting: sql<number>`coalesce(sum(${orders.sellerPayoutOre}) filter (where ${orders.status} = 'completed' and ${orders.stripeTransferId} is null), 0)`.mapWith(Number),
    inProgress: sql<number>`coalesce(sum(${orders.sellerPayoutOre}) filter (where ${orders.status} in ('paid','shipped','delivered','disputed')), 0)`.mapWith(Number),
    paidOut: sql<number>`coalesce(sum(${orders.sellerPayoutOre}) filter (where ${orders.stripeTransferId} is not null), 0)`.mapWith(Number)
  }).from(orders).where(eq(orders.sellerId, userId));
  return {
    hasAccount: !!p?.stripeAccountId, payoutsEnabled: !!p?.payoutsEnabled, kycStatus: p?.kycStatus ?? 'none',
    requirements: p?.stripeRequirements ?? [], disabledReason: p?.stripeDisabledReason ?? null,
    waitingOre: sums?.waiting ?? 0, inProgressOre: sums?.inProgress ?? 0, paidOutOre: sums?.paidOut ?? 0
  };
}

/** Opret (første gang) kontoen hos Stripe og giv et link til Stripes onboarding med ID-kontrol */
export async function onboardingLink(db: Db, gw: StripeGateway, userId: string, appUrl: string): Promise<{ ok: true; url: string } | { ok: false; error: 'not_found' }> {
  const [u] = await db.select({ email: users.email, status: users.status }).from(users).where(eq(users.id, userId));
  if (!u || u.status !== 'active') return { ok: false, error: 'not_found' };
  const base = appUrl.replace(/\/+$/, '');
  await db.insert(sellerProfiles).values({ userId }).onConflictDoNothing();
  let [p] = await db.select({ accountId: sellerProfiles.stripeAccountId }).from(sellerProfiles).where(eq(sellerProfiles.userId, userId));
  if (!p?.accountId) {
    // Idempotensnøgle pr. bruger: to klik samtidig giver stadig kun én Stripe-konto
    const a = await gw.createConnectedAccount({ userId, email: u.email, productDescription: 'Privat salg af brugte ting på Videro', url: base, idempotencyKey: `acct:${userId}` });
    await db.update(sellerProfiles).set({ stripeAccountId: a.id }).where(and(eq(sellerProfiles.userId, userId), sql`${sellerProfiles.stripeAccountId} is null`));
    [p] = await db.select({ accountId: sellerProfiles.stripeAccountId }).from(sellerProfiles).where(eq(sellerProfiles.userId, userId));
  }
  const link = await gw.createAccountLink({ accountId: p!.accountId!, refreshUrl: `${base}/konto/udbetalinger/?forny=1`, returnUrl: `${base}/konto/udbetalinger/?retur=1` });
  return { ok: true, url: link.url };
}

/** Hent status direkte fra Stripe (når sælgeren kommer tilbage fra onboarding – webhooken kan være forsinket) */
export async function syncPayoutAccount(db: Db, gw: StripeGateway, userId: string): Promise<void> {
  const [p] = await db.select({ accountId: sellerProfiles.stripeAccountId }).from(sellerProfiles).where(eq(sellerProfiles.userId, userId));
  if (!p?.accountId) return;
  await applyAccountState(db, p.accountId, await gw.retrieveAccount(p.accountId));
}

export async function stripeDashboardLink(db: Db, gw: StripeGateway, userId: string): Promise<string | null> {
  const [p] = await db.select({ accountId: sellerProfiles.stripeAccountId }).from(sellerProfiles).where(eq(sellerProfiles.userId, userId));
  return p?.accountId ? (await gw.createLoginLink(p.accountId)).url : null;
}

/** KUN udvikling/test uden Stripe: marker kontoen som godkendt, så hele flowet kan prøves lokalt */
export async function simulateVerified(db: Db, userId: string): Promise<void> {
  await db.insert(sellerProfiles).values({ userId }).onConflictDoNothing();
  await db.update(sellerProfiles).set({ stripeAccountId: `acct_sim_${userId.slice(0, 8)}`, payoutsEnabled: true, kycStatus: 'verified', stripeRequirements: [], stripeDisabledReason: null, stripeSyncedAt: new Date() })
    .where(eq(sellerProfiles.userId, userId));
}

/** Hvilke sælgere i en liste kan få udbetalt (bruges til at vise "sælger har ikke oprettet udbetaling endnu") */
export async function payoutReady(db: Db, userIds: string[]): Promise<Set<string>> {
  if (!userIds.length) return new Set();
  const rows = await db.select({ id: sellerProfiles.userId }).from(sellerProfiles).where(and(inArray(sellerProfiles.userId, userIds), eq(sellerProfiles.payoutsEnabled, true)));
  return new Set(rows.map((r) => r.id));
}

/** Stripes kravnavne → forståelig dansk tekst */
export function requirementLabel(r: string): string {
  if (r.includes('verification.document')) return 'Billede af legitimation (pas eller kørekort)';
  if (r.includes('verification.additional_document')) return 'Dokumentation for adresse';
  if (r.includes('external_account')) return 'Bankkonto til udbetaling';
  if (r.includes('dob')) return 'Fødselsdato';
  if (r.includes('address')) return 'Adresse';
  if (r.includes('id_number')) return 'CPR-nummer';
  if (r.includes('phone')) return 'Telefonnummer';
  if (r.includes('email')) return 'E-mail';
  if (r.includes('first_name') || r.includes('last_name')) return 'Navn';
  if (r.includes('tos_acceptance')) return 'Accept af Stripes vilkår';
  if (r.includes('business_profile')) return 'Oplysninger om dit salg';
  return 'Oplysninger til Stripe';
}
