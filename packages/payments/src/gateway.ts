/**
 * Tynd grænseflade mod Stripe. Resten af koden kender kun denne gateway, så den kan testes uden netværk,
 * og Stripe-SDK'et kan opgraderes ét sted. Alle skrivende kald får en idempotensnøgle.
 */
import Stripe from 'stripe';

export const CURRENCY = 'dkk';

export interface StripeGateway {
  createPaymentIntent(p: { amount: number; orderId: string; idempotencyKey: string }): Promise<{ id: string; clientSecret: string }>;
  createTransfer(p: { amount: number; destination: string; orderId: string; sourceTransaction?: string | null; idempotencyKey: string }): Promise<{ id: string }>;
  createRefund(p: { paymentIntentId: string; orderId: string; idempotencyKey: string }): Promise<{ id: string }>;
  /** Kaster hvis signaturen er ugyldig eller for gammel (replay). `rawBody` skal være den RÅ request-tekst. */
  verifyWebhook(rawBody: string, signature: string): Stripe.Event;
}

export function createStripe(secretKey: string): Stripe {
  if (!/^(sk|rk)_(test|live)_[A-Za-z0-9]+$/.test(secretKey)) throw new Error('Ugyldig Stripe-nøgle (forventer sk_/rk_ test/live)');
  return new Stripe(secretKey, { maxNetworkRetries: 2, timeout: 20_000, appInfo: { name: 'respin' } });
}

export function stripeGateway(stripe: Stripe, webhookSecret: string): StripeGateway {
  if (!webhookSecret.startsWith('whsec_')) throw new Error('Ugyldig webhook-hemmelighed');
  return {
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
    verifyWebhook(rawBody, signature) {
      return stripe.webhooks.constructEvent(rawBody, signature, webhookSecret, 300);
    }
  };
}
