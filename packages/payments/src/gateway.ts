/**
 * Tynd grænseflade mod Stripe. Resten af koden kender kun denne gateway, så den kan testes uden netværk,
 * og Stripe-SDK'et kan opgraderes ét sted. Alle skrivende kald får en idempotensnøgle.
 */
import Stripe from 'stripe';

export const CURRENCY = 'dkk';

/** Sælgerens udbetalingskonto hos Stripe, som Videro ser den (aldrig persondata – kun status) */
export interface ConnectedAccountState {
  /** Stripe har godkendt identitet og bankkonto, og pengene kan overføres og udbetales */
  payoutsEnabled: boolean;
  /** Sælgeren har udfyldt onboarding (men Stripe kan stadig være ved at kontrollere) */
  detailsSubmitted: boolean;
  /** Felter Stripe mangler nu eller snart (fx "individual.verification.document") */
  requirements: string[];
  /** Felter der er forfaldne – udbetalinger er sat på pause, til de er udfyldt */
  pastDue: string[];
  /** Stripes årsag til begrænsning, fx "requirements.past_due" eller "rejected.fraud" */
  disabledReason: string | null;
  kycStatus: 'none' | 'pending' | 'verified' | 'rejected';
}

/** Oversæt Stripes konto-objekt til Videros status. Ren funktion (bruges af både webhook og direkte opslag). */
export function accountState(a: Pick<Stripe.Account, 'payouts_enabled' | 'details_submitted' | 'requirements' | 'capabilities'>): ConnectedAccountState {
  const r = a.requirements;
  const requirements = [...new Set([...(r?.currently_due ?? []), ...(r?.eventually_due ?? [])])];
  const pastDue = r?.past_due ?? [];
  const disabledReason = r?.disabled_reason ?? null;
  const transfers = a.capabilities?.transfers;
  const payoutsEnabled = !!a.payouts_enabled && transfers === 'active';
  const kycStatus = disabledReason?.startsWith('rejected') ? 'rejected' : payoutsEnabled ? 'verified' : a.details_submitted ? 'pending' : 'none';
  return { payoutsEnabled, detailsSubmitted: !!a.details_submitted, requirements, pastDue, disabledReason, kycStatus };
}

export interface StripeGateway {
  /** Opret sælgerens udbetalingskonto (Express, privatperson i Danmark). Stripe står for ID-kontrol (KYC) og bankkonto. */
  createConnectedAccount(p: { userId: string; email: string; productDescription: string; url: string; idempotencyKey: string }): Promise<{ id: string }>;
  /** Engangslink til Stripes hostede onboarding (identitet, adresse, bankkonto, evt. legitimation) */
  createAccountLink(p: { accountId: string; refreshUrl: string; returnUrl: string }): Promise<{ url: string }>;
  /** Link til sælgerens Stripe-oversigt (udbetalinger, bankkonto) */
  createLoginLink(accountId: string): Promise<{ url: string }>;
  retrieveAccount(accountId: string): Promise<ConnectedAccountState>;
  /** Stripe Checkout til et køb: varen, køberbeskyttelse og fragt som separate linjer; leveringsadresse indsamles af Stripe */
  createOrderCheckoutSession(p: { orderId: string; lines: { name: string; amountOre: number }[]; customerEmail: string; successUrl: string; cancelUrl: string; idempotencyKey: string }): Promise<{ id: string; url: string }>;
  expireCheckoutSession(sessionId: string): Promise<void>;
  createPaymentIntent(p: { amount: number; orderId: string; idempotencyKey: string }): Promise<{ id: string; clientSecret: string }>;
  createTransfer(p: { amount: number; destination: string; orderId: string; sourceTransaction?: string | null; idempotencyKey: string }): Promise<{ id: string }>;
  createRefund(p: { paymentIntentId: string; orderId: string; idempotencyKey: string }): Promise<{ id: string }>;
  /** Stripe Checkout (hostet betalingsside) til køb af fremhævning. Kortdata rører aldrig vores servere. */
  createCheckoutSession(p: { amountOre: number; productName: string; promotionId: string; successUrl: string; cancelUrl: string; idempotencyKey: string }): Promise<{ id: string; url: string }>;
  /** Kaster hvis signaturen er ugyldig eller for gammel (replay). `rawBody` skal være den RÅ request-tekst. */
  verifyWebhook(rawBody: string, signature: string): Stripe.Event;
}

export function createStripe(secretKey: string): Stripe {
  if (!/^(sk|rk)_(test|live)_[A-Za-z0-9]+$/.test(secretKey)) throw new Error('Ugyldig Stripe-nøgle (forventer sk_/rk_ test/live)');
  return new Stripe(secretKey, { maxNetworkRetries: 2, timeout: 20_000, appInfo: { name: 'respin' } });
}

/**
 * @param webhookSecret hemmelighed for platformens webhook-endpoint
 * @param connectWebhookSecret (valgfri) hemmelighed for Connect-endpointet (events fra sælgernes konti, fx account.updated)
 */
export function stripeGateway(stripe: Stripe, webhookSecret: string, connectWebhookSecret?: string | null): StripeGateway {
  if (!webhookSecret.startsWith('whsec_')) throw new Error('Ugyldig webhook-hemmelighed');
  if (connectWebhookSecret && !connectWebhookSecret.startsWith('whsec_')) throw new Error('Ugyldig Connect-webhook-hemmelighed');
  return {
    async createConnectedAccount({ userId, email, productDescription, url, idempotencyKey }) {
      const a = await stripe.accounts.create({
        type: 'express', country: 'DK', email, business_type: 'individual',
        // Kun modtagelse af overførsler fra Videro (sælgeren tager ikke selv imod kortbetalinger)
        capabilities: { transfers: { requested: true } },
        tos_acceptance: { service_agreement: 'recipient' },
        business_profile: { mcc: '5931', product_description: productDescription, url },
        settings: { payouts: { schedule: { interval: 'daily' } } },
        metadata: { userId }
      }, { idempotencyKey });
      return { id: a.id };
    },
    async createAccountLink({ accountId, refreshUrl, returnUrl }) {
      const l = await stripe.accountLinks.create({ account: accountId, refresh_url: refreshUrl, return_url: returnUrl, type: 'account_onboarding', collection_options: { fields: 'eventually_due' } });
      return { url: l.url };
    },
    async createLoginLink(accountId) {
      const l = await stripe.accounts.createLoginLink(accountId);
      return { url: l.url };
    },
    async retrieveAccount(accountId) {
      return accountState(await stripe.accounts.retrieve(accountId));
    },
    async createOrderCheckoutSession({ orderId, lines, customerEmail, successUrl, cancelUrl, idempotencyKey }) {
      const metadata = { kind: 'order', orderId };
      const cs = await stripe.checkout.sessions.create({
        mode: 'payment', locale: 'da', customer_email: customerEmail, client_reference_id: orderId,
        line_items: lines.map((l) => ({ quantity: 1, price_data: { currency: CURRENCY, unit_amount: l.amountOre, product_data: { name: l.name.slice(0, 120) } } })),
        shipping_address_collection: { allowed_countries: ['DK'] },
        phone_number_collection: { enabled: true },
        payment_intent_data: { metadata, transfer_group: orderId },
        success_url: successUrl, cancel_url: cancelUrl, metadata,
        expires_at: Math.floor(Date.now() / 1000) + 30 * 60 // samme vindue som ordren (PAYMENT_WINDOW_MINUTES)
      }, { idempotencyKey });
      if (!cs.url) throw new Error('Checkout-session mangler url');
      return { id: cs.id, url: cs.url };
    },
    async expireCheckoutSession(sessionId) {
      try { await stripe.checkout.sessions.expire(sessionId); } catch { /* allerede betalt/udløbet */ }
    },
    async createPaymentIntent({ amount, orderId, idempotencyKey }) {
      const pi = await stripe.paymentIntents.create(
        { amount, currency: CURRENCY, metadata: { orderId }, transfer_group: orderId, automatic_payment_methods: { enabled: true } },
        { idempotencyKey }
      );
      if (!pi.client_secret) throw new Error('PaymentIntent mangler client_secret');
      return { id: pi.id, clientSecret: pi.client_secret };
    },
    async createTransfer({ amount, destination, orderId, sourceTransaction, idempotencyKey }) {
      const t = await stripe.transfers.create(
        { amount, currency: CURRENCY, destination, transfer_group: orderId, metadata: { orderId }, ...(sourceTransaction ? { source_transaction: sourceTransaction } : {}) },
        { idempotencyKey }
      );
      return { id: t.id };
    },
    async createRefund({ paymentIntentId, orderId, idempotencyKey }) {
      const r = await stripe.refunds.create({ payment_intent: paymentIntentId, metadata: { orderId } }, { idempotencyKey });
      return { id: r.id };
    },
    async createCheckoutSession({ amountOre, productName, promotionId, successUrl, cancelUrl, idempotencyKey }) {
      const metadata = { kind: 'promotion', promotionId };
      const cs = await stripe.checkout.sessions.create({
        mode: 'payment',
        line_items: [{ quantity: 1, price_data: { currency: CURRENCY, unit_amount: amountOre, product_data: { name: productName } } }],
        success_url: successUrl, cancel_url: cancelUrl, client_reference_id: promotionId,
        metadata, payment_intent_data: { metadata },
        expires_at: Math.floor(Date.now() / 1000) + 30 * 60 // betalingssiden udløber efter 30 min.
      }, { idempotencyKey });
      if (!cs.url) throw new Error('Checkout-session mangler url');
      return { id: cs.id, url: cs.url };
    },
    verifyWebhook(rawBody, signature) {
      try { return stripe.webhooks.constructEvent(rawBody, signature, webhookSecret, 300); } catch (e) {
        if (!connectWebhookSecret) throw e;
        return stripe.webhooks.constructEvent(rawBody, signature, connectWebhookSecret, 300);
      }
    }
  };
}
