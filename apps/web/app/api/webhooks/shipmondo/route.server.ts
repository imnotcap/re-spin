import { getDb } from '../../../../lib/server';
import { verifyShipmondoJwt } from '../../../../lib/shipmondo';
import { handleTrackingEvent } from '../../../../lib/shipping';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const MAX_BODY_BYTES = 200_000;

/**
 * Shipmondo-webhook (Shipment Monitor: "latest" og "delivered"). Body er `{ "data": "<JWT>" }` signeret med
 * SHIPMONDO_WEBHOOK_KEY (HS256). Ugyldig signatur → 401 uden forklaring. Skal svare inden for 5 sekunder.
 */
export async function POST(req: Request) {
  const key = process.env.SHIPMONDO_WEBHOOK_KEY;
  if (!key || key.length < 16) return new Response(null, { status: 404 });
  const raw = await req.text();
  if (raw.length > MAX_BODY_BYTES) return new Response(null, { status: 413 });
  let token = '';
  try { token = String((JSON.parse(raw) as { data?: unknown }).data ?? ''); } catch { return new Response(null, { status: 400 }); }
  const payload = verifyShipmondoJwt(token, key);
  if (!payload) return new Response(null, { status: 401 });
  const resourceType = req.headers.get('smd-resource-type');
  const action = req.headers.get('smd-action');
  // Kun sporingshændelser flytter ordrer; andre ressourcer (fx oprettelse af forsendelse) ignoreres
  const tracking = /monitor/i.test(resourceType ?? '') || action === 'latest' || action === 'delivered';
  if (!tracking) return new Response(null, { status: 200 });
  try {
    await handleTrackingEvent(getDb(), { resourceId: req.headers.get('smd-resource-id'), action, payload });
    return new Response(null, { status: 200, headers: { 'Cache-Control': 'no-store' } });
  } catch (e) {
    console.error('shipmondo-webhook-fejl', e instanceof Error ? e.message.slice(0, 120) : 'ukendt');
    return new Response(null, { status: 500 });
  }
}
