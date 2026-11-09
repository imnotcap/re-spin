import 'server-only';
/**
 * Forsendelse via Shipmondo: køber vælger pakkeshop ved købet, Videro laver en forudbetalt label, når ordren er
 * betalt, og sporingshændelser (webhook) flytter ordren til "Sendt" og "Modtaget" af sig selv.
 * Uden Shipmondo-nøgler bruges det manuelle flow (sælger skriver selv sporingsnummer).
 */
import { and, eq, isNotNull, isNull, lt } from 'drizzle-orm';
import { z } from 'zod';
import { schema, type Db } from '@respin/db';
import { applyOrderEvent } from '@respin/payments';
import { classifyTracking, shipmondoClient, type PickupPoint, type ShipmondoClient } from './shipmondo';

const { orders, sellerProfiles, users, listings } = schema;
const MAX_LABEL_ATTEMPTS = 5;

/** Fragtprodukt (standard: GLS ShopDelivery til pakkeshop). Kan ændres med miljøvariabler uden ny kode. */
export const SHIPPING_CONFIG = {
  carrier: process.env.SHIPMONDO_CARRIER || 'gls',
  productCode: process.env.SHIPMONDO_PRODUCT_CODE || 'GLSDK_SD',
  serviceCodes: process.env.SHIPMONDO_SERVICE_CODES ?? 'EMAIL_NT,SMS_NT',
  testMode: process.env.SHIPMONDO_TEST_MODE === '1'
};
/** Erklæret vægt pr. pakkestørrelse (øvre grænse for størrelsen) */
const WEIGHT_GRAMS = { small: 2000, medium: 5000 } as const;

const g = globalThis as unknown as { __shipmondo?: ShipmondoClient | null; __pickupCache?: Map<string, { at: number; points: PickupPoint[] }> };
export function getShipmondoOrNull(): ShipmondoClient | null {
  if (g.__shipmondo === undefined) {
    const user = process.env.SHIPMONDO_API_USER, key = process.env.SHIPMONDO_API_KEY;
    g.__shipmondo = user && key ? shipmondoClient(user, key) : null;
  }
  return g.__shipmondo;
}

/** Nærmeste pakkeshops for et postnummer (cache i 1 time – pakkeshops ændrer sig sjældent) */
export async function pickupPoints(client: ShipmondoClient, zipcode: string): Promise<PickupPoint[]> {
  if (!/^\d{4}$/.test(zipcode)) return [];
  const cache = (g.__pickupCache ??= new Map());
  const key = `${SHIPPING_CONFIG.carrier}:${zipcode}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < 3_600_000) return hit.points;
  const points = await client.pickupPoints({ carrier: SHIPPING_CONFIG.carrier, zipcode });
  if (cache.size > 2000) cache.clear();
  cache.set(key, { at: Date.now(), points });
  return points;
}

/** Klienten sender kun id + postnummer; selve pakkeshoppen slås op igen hos Shipmondo (kan ikke forfalskes) */
export async function resolvePickupPoint(client: ShipmondoClient, id: string, zipcode: string) {
  const p = (await pickupPoints(client, zipcode)).find((x) => x.id === id);
  return p ? { id: p.id, carrier: p.carrier, name: p.name, address: p.address, zipcode: p.zipcode, city: p.city } : null;
}

const senderInput = z.object({
  name: z.string().trim().min(2).max(60),
  address1: z.string().trim().min(3).max(80),
  zipcode: z.string().trim().regex(/^\d{4}$/),
  city: z.string().trim().min(2).max(40),
  mobile: z.string().trim().regex(/^(\+45)?\s?\d{2}\s?\d{2}\s?\d{2}\s?\d{2}$/)
}).strict();

export async function saveSenderAddress(db: Db, userId: string, raw: unknown): Promise<{ ok: true } | { ok: false; field: string }> {
  const p = senderInput.safeParse(raw);
  if (!p.success) return { ok: false, field: String(p.error.issues[0]?.path[0] ?? '') };
  await db.insert(sellerProfiles).values({ userId }).onConflictDoNothing();
  await db.update(sellerProfiles).set({ senderAddress: { ...p.data, mobile: p.data.mobile.replace(/\s/g, '') } }).where(eq(sellerProfiles.userId, userId));
  return { ok: true };
}

export async function senderAddressOf(db: Db, userId: string) {
  const [p] = await db.select({ a: sellerProfiles.senderAddress }).from(sellerProfiles).where(eq(sellerProfiles.userId, userId));
  return p?.a ?? null;
}

export type LabelResult = 'created' | 'exists' | 'needs_sender' | 'not_ready' | 'failed';

/** Opret fragtlabel for en betalt ordre (idempotent: én forsendelse pr. ordre) */
export async function createLabelForOrder(db: Db, client: ShipmondoClient, orderId: string): Promise<LabelResult> {
  const [row] = await db.select({ o: orders, title: listings.title, size: listings.shippingSize }).from(orders).innerJoin(listings, eq(listings.id, orders.listingId)).where(eq(orders.id, orderId));
  if (!row) return 'not_ready';
  const o = row.o;
  if (o.shipmondoShipmentId) return 'exists';
  if (o.status !== 'paid' || !o.servicePoint || !o.shippingAddress) return 'not_ready';
  const sender = await senderAddressOf(db, o.sellerId);
  if (!sender) return 'needs_sender';
  const [buyer] = await db.select({ email: users.email }).from(users).where(eq(users.id, o.buyerId));
  const [sellerUser] = await db.select({ email: users.email }).from(users).where(eq(users.id, o.sellerId));
  const a = o.shippingAddress;
  try {
    const s = await client.createShipment({
      productCode: SHIPPING_CONFIG.productCode, serviceCodes: SHIPPING_CONFIG.serviceCodes, testMode: SHIPPING_CONFIG.testMode,
      reference: `Videro ${o.id.slice(0, 8)}`, servicePointId: o.servicePoint.id, weightGrams: WEIGHT_GRAMS[row.size],
      sender: { name: sender.name, address1: sender.address1, zipcode: sender.zipcode, city: sender.city, countryCode: 'DK', email: sellerUser?.email, mobile: sender.mobile },
      receiver: { name: a.name, address1: a.line1, zipcode: a.postalCode, city: a.city, countryCode: 'DK', email: buyer?.email, mobile: a.phone }
    });
    // Kun hvis ingen anden proces nåede først (unik shipment-id + betingelse)
    await db.update(orders).set({ shipmondoShipmentId: s.id, trackingNumber: s.trackingNumber, carrier: o.servicePoint.carrier.toUpperCase() === 'GLS' ? 'GLS' : o.servicePoint.carrier, labellessCode: s.labellessCode, labelError: null, updatedAt: new Date() })
      .where(and(eq(orders.id, o.id), isNull(orders.shipmondoShipmentId)));
    return 'created';
  } catch (e) {
    await db.update(orders).set({ labelAttempts: o.labelAttempts + 1, labelError: (e instanceof Error ? e.message : 'ukendt').slice(0, 300) }).where(eq(orders.id, o.id));
    return 'failed';
  }
}

/** Cron: lav labels for betalte ordrer med pakkeshop, hvor sælgeren har en afsenderadresse */
export async function runShippingLabels(db: Db, client: ShipmondoClient, limit = 25): Promise<{ created: number; waiting: number; failed: number }> {
  const due = await db.select({ id: orders.id }).from(orders)
    .where(and(eq(orders.status, 'paid'), isNull(orders.shipmondoShipmentId), isNotNull(orders.servicePoint), isNotNull(orders.shippingAddress), lt(orders.labelAttempts, MAX_LABEL_ATTEMPTS))).limit(limit);
  const out = { created: 0, waiting: 0, failed: 0 };
  for (const { id } of due) {
    const r = await createLabelForOrder(db, client, id);
    if (r === 'created') out.created++; else if (r === 'failed') out.failed++; else out.waiting++;
  }
  return out;
}

/**
 * Sporingshændelse fra Shipmondo (Shipment Monitor). Pakken scannet → "Sendt"; leveret/klar i pakkeshop → "Modtaget"
 * (køberens 48 timer starter). Alt går gennem tilstandsmaskinen; gentagne hændelser er ufarlige.
 */
export async function handleTrackingEvent(db: Db, input: { resourceId: string | null; action: string | null; payload: Record<string, unknown> }, now = new Date()): Promise<'updated' | 'ignored' | 'not_found'> {
  const shipmentId = input.resourceId ?? (typeof input.payload.id === 'number' || typeof input.payload.id === 'string' ? String(input.payload.id) : null);
  if (!shipmentId || !/^[0-9A-Za-z_-]{1,40}$/.test(shipmentId)) return 'not_found';
  const [o] = await db.select({ id: orders.id, status: orders.status }).from(orders).where(eq(orders.shipmondoShipmentId, shipmentId));
  if (!o) return 'not_found';
  const t = classifyTracking(input.action, input.payload);
  if (t.kind === 'unknown') return 'ignored';
  await db.update(orders).set({ trackingStatus: t.text, trackingUpdatedAt: now }).where(eq(orders.id, o.id));
  const meta = { source: 'shipmondo', action: input.action };
  if (o.status === 'paid') await applyOrderEvent(db, { orderId: o.id, event: 'carrier_picked_up', actor: 'system', now, metadata: meta });
  if (t.kind === 'delivered') await applyOrderEvent(db, { orderId: o.id, event: 'carrier_delivered', actor: 'system', now, metadata: meta });
  return 'updated';
}
