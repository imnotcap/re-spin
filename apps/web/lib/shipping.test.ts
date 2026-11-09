import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createHmac } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { schema, type Db } from '@respin/db';
import { createTestDb } from '@respin/db/testing';
import { startOrderCheckout } from '@respin/payments';
import { classifyTracking, trackingUrl, verifyShipmondoJwt, type ShipmondoClient } from './shipmondo';
import { createLabelForOrder, handleTrackingEvent, resolvePickupPoint, runShippingLabels, saveSenderAddress } from './shipping';

const s = schema;
let db: Db, close: () => Promise<void>;
beforeAll(async () => { ({ db, close } = await createTestDb()); });
afterAll(async () => { await close(); });

const KEY = 'shipmondo-webhook-noegle-123456';
const b64 = (o: unknown) => Buffer.from(JSON.stringify(o)).toString('base64url');
function jwt(payload: unknown, key = KEY, alg = 'HS256') {
  const h = b64({ alg, typ: 'JWT' }), p = b64(payload);
  return `${h}.${p}.${createHmac('sha256', key).update(`${h}.${p}`).digest('base64url')}`;
}

const POINT = { id: '96100', carrier: 'gls', name: 'Netto Nørregade', address: 'Nørregade 1', zipcode: '1165', city: 'København K', distanceM: 120, openingHours: [] };
let n = 0; // globalt: forsendelses-id'er er unikke hos Shipmondo
function fakeClient() {
  const created: Parameters<ShipmondoClient['createShipment']>[0][] = [];
  const client: ShipmondoClient = {
    pickupPoints: async ({ zipcode }) => (zipcode === '1165' ? [POINT] : []),
    createShipment: async (p) => { created.push(p); n++; return { id: `${9000 + n}`, trackingNumber: `GLS${n}`, labellessCode: `QR${n}` }; },
    label: async () => ({ pdf: Buffer.from('%PDF-1.4') })
  };
  return { client, created };
}

let k = 0;
async function paidOrder() {
  const i = ++k;
  const mk = async (n: string) => (await db.insert(s.users).values({ email: `${n}${i}@sh.dk`, emailNormalized: `${n}${i}@sh.dk`, displayName: n }).returning())[0]!;
  const seller = await mk('saelger'), buyer = await mk('koeber');
  const [l] = await db.insert(s.listings).values({ sellerId: seller.id, title: 'Jakke', category: 'kvinder', condition: 'good', priceOre: 30_000, shippingSize: 'small', status: 'active', moderationStatus: 'approved' }).returning();
  const r = await startOrderCheckout(db, null, { buyerId: buyer.id, buyerEmail: 'k@sh.dk', listingId: l!.id, appUrl: 'x', simulate: true,
    servicePoint: { id: POINT.id, carrier: 'gls', name: POINT.name, address: POINT.address, zipcode: POINT.zipcode, city: POINT.city } });
  if (!r.ok) throw new Error(r.reason);
  // Leveringsadressen kommer normalt fra Stripe Checkout
  await db.update(s.orders).set({ shippingAddress: { name: 'Jonas', line1: 'Vestergade 2', postalCode: '8000', city: 'Aarhus C', country: 'DK', phone: '+4520202020' } }).where(eq(s.orders.id, r.orderId));
  return { seller, buyer, orderId: r.orderId };
}
const order = async (id: string) => (await db.select().from(s.orders).where(eq(s.orders.id, id)))[0]!;

describe('Shipmondo-webhook: signatur', () => {
  it('accepterer kun HS256 med den rigtige nøgle og uændret indhold', () => {
    expect(verifyShipmondoJwt(jwt({ id: 1 }), KEY)).toEqual({ id: 1 });
    expect(verifyShipmondoJwt(jwt({ id: 1 }, 'forkert-noegle-1234567890'), KEY)).toBeNull();
    const [h, , sig] = jwt({ id: 1 }).split('.');
    expect(verifyShipmondoJwt(`${h}.${b64({ id: 2 })}.${sig}`, KEY)).toBeNull(); // ændret indhold
    expect(verifyShipmondoJwt(`${b64({ alg: 'none' })}.${b64({ id: 1 })}.`, KEY)).toBeNull(); // "none"-angreb
    expect(verifyShipmondoJwt(jwt({ id: 1 }, KEY, 'HS512'), KEY)).toBeNull();
    expect(verifyShipmondoJwt('ikke.en.jwt', KEY)).toBeNull();
  });
});

describe('sporingsstatus', () => {
  it('genkender leveret/klar til afhentning og "på vej"', () => {
    expect(classifyTracking('delivered', {}).kind).toBe('delivered');
    expect(classifyTracking('latest', { latest_event: { description: 'Pakken er klar til afhentning i pakkeshoppen' } }).kind).toBe('delivered');
    expect(classifyTracking('latest', { status: 'Delivered to ParcelShop' }).kind).toBe('delivered');
    expect(classifyTracking('latest', { latest_event: { description: 'Pakken er modtaget i pakkecenter' } })).toEqual({ kind: 'in_transit', text: 'Pakken er modtaget i pakkecenter' });
    expect(classifyTracking(null, {}).kind).toBe('unknown');
    expect(trackingUrl('GLS', '123')).toContain('gls-group.com');
    expect(trackingUrl(null, '123')).toBeNull();
  });
});

describe('fragtlabel og automatisk status', () => {
  it('pakkeshop valideres hos Shipmondo – et opdigtet id afvises', async () => {
    const { client } = fakeClient();
    expect(await resolvePickupPoint(client, '96100', '1165')).toMatchObject({ id: '96100', name: 'Netto Nørregade' });
    expect(await resolvePickupPoint(client, 'falsk', '1165')).toBeNull();
    expect(await resolvePickupPoint(client, '96100', 'abcd')).toBeNull();
  });

  it('label kræver afsenderadresse; laves én gang med pakkeshop, modtager og afsender', async () => {
    const { client, created } = fakeClient(); const m = await paidOrder();
    expect(await createLabelForOrder(db, client, m.orderId)).toBe('needs_sender');
    expect(await saveSenderAddress(db, m.seller.id, { name: 'Mette', address1: 'Bygade 3', zipcode: '5000', city: 'Odense C', mobile: '12 34 56 78' })).toEqual({ ok: true });
    expect(await saveSenderAddress(db, m.seller.id, { name: 'M', address1: 'x', zipcode: '50', city: 'y', mobile: 'abc' })).toMatchObject({ ok: false });
    expect(await runShippingLabels(db, client)).toMatchObject({ created: 1 });
    expect(await createLabelForOrder(db, client, m.orderId)).toBe('exists');
    expect(created).toHaveLength(1);
    expect(created[0]).toMatchObject({ productCode: 'GLSDK_SD', servicePointId: '96100', weightGrams: 2000,
      sender: { name: 'Mette', zipcode: '5000', mobile: '12345678' }, receiver: { name: 'Jonas', zipcode: '8000', mobile: '+4520202020' } });
    expect(await order(m.orderId)).toMatchObject({ status: 'paid', shipmondoShipmentId: expect.any(String), trackingNumber: expect.stringMatching(/^GLS/), labellessCode: expect.stringMatching(/^QR/) });
  });

  it('sporing: scannet → Sendt (uden at sælgeren gør noget); klar i pakkeshop → Modtaget med 48-timers frist', async () => {
    const { client } = fakeClient(); const m = await paidOrder();
    await saveSenderAddress(db, m.seller.id, { name: 'Mette', address1: 'Bygade 3', zipcode: '5000', city: 'Odense C', mobile: '12345678' });
    await createLabelForOrder(db, client, m.orderId);
    const shipment = (await order(m.orderId)).shipmondoShipmentId!;
    expect(await handleTrackingEvent(db, { resourceId: shipment, action: 'latest', payload: { latest_event: { description: 'Pakken er indleveret i pakkeshop' } } })).toBe('updated');
    let o = await order(m.orderId);
    expect(o).toMatchObject({ status: 'shipped', carrier: 'GLS', trackingStatus: 'Pakken er indleveret i pakkeshop' });
    expect(o.trackingNumber).toMatch(/^GLS/); // bevaret fra labelen
    expect(await handleTrackingEvent(db, { resourceId: shipment, action: 'delivered', payload: {} })).toBe('updated');
    o = await order(m.orderId);
    expect(o.status).toBe('delivered');
    expect(o.autoCompleteAt!.getTime() - Date.now()).toBeGreaterThan(47 * 3_600_000);
    // Gentaget hændelse er ufarlig
    expect(await handleTrackingEvent(db, { resourceId: shipment, action: 'delivered', payload: {} })).toBe('updated');
    expect((await order(m.orderId)).status).toBe('delivered');
    expect(await handleTrackingEvent(db, { resourceId: '999999', action: 'delivered', payload: {} })).toBe('not_found');
  });

  it('leveret uden forudgående scanning springer direkte til Modtaget', async () => {
    const { client } = fakeClient(); const m = await paidOrder();
    await saveSenderAddress(db, m.seller.id, { name: 'Mette', address1: 'Bygade 3', zipcode: '5000', city: 'Odense C', mobile: '12345678' });
    await createLabelForOrder(db, client, m.orderId);
    await handleTrackingEvent(db, { resourceId: (await order(m.orderId)).shipmondoShipmentId, action: 'delivered', payload: {} });
    expect((await order(m.orderId)).status).toBe('delivered');
  });
});
