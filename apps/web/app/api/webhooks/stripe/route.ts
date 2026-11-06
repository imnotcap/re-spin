import { httpStatusFor, ingestStripeWebhook } from '@respin/payments';
import { getDb, getStripeGateway } from '../../../../lib/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const MAX_BODY_BYTES = 1_000_000;

/**
 * Stripe-webhook. Signaturen verificeres på den RÅ body (`req.text()`, aldrig `req.json()`).
 * Intet i svaret afslører hvorfor en request blev afvist.
 */
export async function POST(req: Request) {
  const declared = Number(req.headers.get('content-length') ?? 0);
  if (declared > MAX_BODY_BYTES) return new Response(null, { status: 413 });
  const rawBody = await req.text();
  if (rawBody.length > MAX_BODY_BYTES) return new Response(null, { status: 413 });

  const db = getDb();
  const gateway = getStripeGateway();
  const outcome = await ingestStripeWebhook(db, gateway, { rawBody, signature: req.headers.get('stripe-signature') });
  if (outcome.status === 'failed') console.error('stripe webhook failed', { eventId: outcome.eventId }); // intet payload/PII i logs
  return new Response(null, { status: httpStatusFor(outcome), headers: { 'Cache-Control': 'no-store' } });
}
