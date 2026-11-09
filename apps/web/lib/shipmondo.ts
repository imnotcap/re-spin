/**
 * Shipmondo (fragtplatform): pakkeshopsøgning, fragtlabels og sporing for PostNord, GLS, DAO m.fl.
 * Feltnavne følger Shipmondos API v3-specifikation (app.shipmondo.com/api/public/v3/specification).
 * Ren modul uden server-only, så signatur- og statusreglerne kan enhedstestes.
 */
import { createHmac, timingSafeEqual } from 'node:crypto';

const API = 'https://app.shipmondo.com/api/public/v3';

export interface PickupPoint { id: string; carrier: string; name: string; address: string; zipcode: string; city: string; distanceM: number | null; openingHours: string[] }
export interface Party { name: string; address1: string; zipcode: string; city: string; countryCode: 'DK'; email?: string | null; mobile?: string | null }
export interface CreatedShipment { id: string; trackingNumber: string | null; labellessCode: string | null }

export interface ShipmondoClient {
  pickupPoints(p: { carrier: string; zipcode: string }): Promise<PickupPoint[]>;
  createShipment(p: { productCode: string; serviceCodes: string; reference: string; sender: Party; receiver: Party; servicePointId: string; weightGrams: number; testMode: boolean }): Promise<CreatedShipment>;
  label(shipmentId: string): Promise<{ pdf: Buffer } | null>;
}

/** HTTP Basic med API-bruger og API-nøgle fra Shipmondo (Indstillinger → API) */
export function shipmondoClient(apiUser: string, apiKey: string, fetchImpl: typeof fetch = fetch): ShipmondoClient {
  const auth = `Basic ${Buffer.from(`${apiUser}:${apiKey}`).toString('base64')}`;
  const call = async (path: string, init: RequestInit = {}) => {
    const res = await fetchImpl(`${API}${path}`, { ...init, headers: { Authorization: auth, Accept: 'application/json', 'Content-Type': 'application/json', ...(init.headers ?? {}) }, signal: AbortSignal.timeout(15_000) });
    const text = await res.text();
    if (!res.ok) throw new Error(`Shipmondo ${res.status}: ${text.slice(0, 300)}`);
    return text ? JSON.parse(text) : null;
  };
  return {
    async pickupPoints({ carrier, zipcode }) {
      const rows = (await call(`/pickup_points?${new URLSearchParams({ carrier_code: carrier, country_code: 'DK', zipcode, quantity: '10' })}`)) as Record<string, unknown>[];
      return (Array.isArray(rows) ? rows : []).map((r) => ({
        id: String(r.number ?? r.id ?? ''), carrier: String(r.carrier_code ?? carrier), name: String(r.company_name ?? r.name ?? 'Pakkeshop'),
        address: String(r.address ?? ''), zipcode: String(r.zipcode ?? ''), city: String(r.city ?? ''),
        distanceM: typeof r.distance === 'number' ? r.distance : null, openingHours: Array.isArray(r.opening_hours) ? (r.opening_hours as string[]).slice(0, 7) : []
      })).filter((p) => p.id);
    },
    async createShipment(p) {
      const party = (x: Party) => ({ name: x.name, address1: x.address1, zipcode: x.zipcode, city: x.city, country_code: x.countryCode, email: x.email ?? undefined, mobile: x.mobile ?? undefined });
      const r = (await call('/shipments', { method: 'POST', body: JSON.stringify({
        test_mode: p.testMode, own_agreement: false, label_format: 'a4_pdf', product_code: p.productCode, service_codes: p.serviceCodes,
        reference: p.reference, automatic_select_service_point: false, service_point: { id: p.servicePointId },
        sender: party(p.sender), receiver: party(p.receiver), parcels: [{ weight: p.weightGrams }]
      }) })) as { id?: number; pkg_no?: string | null; labelless_code?: string | null; parcels?: { pkg_no?: string | null }[] };
      if (!r?.id) throw new Error('Shipmondo svarede uden forsendelses-id');
      return { id: String(r.id), trackingNumber: r.pkg_no ?? r.parcels?.[0]?.pkg_no ?? null, labellessCode: r.labelless_code ?? null };
    },
    async label(shipmentId) {
      const rows = (await call(`/shipments/${encodeURIComponent(shipmentId)}/labels?label_format=a4_pdf`)) as { base64?: string }[] | { base64?: string };
      const first = Array.isArray(rows) ? rows[0] : rows;
      return first?.base64 ? { pdf: Buffer.from(first.base64, 'base64') } : null;
    }
  };
}

/**
 * Shipmondo-webhooks sender `{ "data": "<JWT>" }`, signeret med HS256 og den nøgle, der blev valgt ved oprettelsen.
 * Returnerer payload, eller null hvis signaturen ikke passer (tidskonstant sammenligning).
 */
export function verifyShipmondoJwt(token: string, key: string): Record<string, unknown> | null {
  const parts = token.split('.');
  if (parts.length !== 3 || key.length < 16) return null;
  const [h, p, sig] = parts as [string, string, string];
  try {
    const header = JSON.parse(Buffer.from(h, 'base64url').toString('utf8')) as { alg?: string };
    if (header.alg !== 'HS256') return null; // ingen "none" eller andre algoritmer
    const want = createHmac('sha256', key).update(`${h}.${p}`).digest();
    const got = Buffer.from(sig, 'base64url');
    if (got.length !== want.length || !timingSafeEqual(got, want)) return null;
    const payload = JSON.parse(Buffer.from(p, 'base64url').toString('utf8'));
    return payload && typeof payload === 'object' ? (payload as Record<string, unknown>) : null;
  } catch { return null; }
}

export type TrackingKind = 'delivered' | 'in_transit' | 'unknown';

/** Find statustekster i en sporingsbesked (felterne varierer mellem fragtfirmaer) */
function texts(v: unknown, depth = 0, out: string[] = []): string[] {
  if (depth > 4 || out.length > 40) return out;
  if (typeof v === 'string') out.push(v);
  else if (Array.isArray(v)) v.slice(0, 20).forEach((x) => texts(x, depth + 1, out));
  else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) if (/status|event|description|text|message|state|delivered/i.test(k)) texts(x, depth + 1, out);
  return out;
}

const DELIVERED = /\b(delivered|udleveret|leveret|afhentet|ready.?for.?pick.?up|klar til afhentning|available for pick.?up|kan afhentes)\b/i;

/**
 * Oversæt en Shipmondo-hændelse til Videros status. Action "delivered" (Shipment Monitor) er altid leveret;
 * ellers ledes efter leveringsord i statusfelterne. Enhver anden sporingshændelse betyder, at pakken er på vej.
 */
export function classifyTracking(action: string | null, payload: Record<string, unknown>): { kind: TrackingKind; text: string | null } {
  const all = texts(payload);
  const text = all.find((t) => t.trim().length > 2 && !/^\d+$/.test(t))?.slice(0, 200) ?? null;
  if (action === 'delivered' || payload.delivered === true || all.some((t) => DELIVERED.test(t))) return { kind: 'delivered', text: text ?? 'Leveret' };
  if (action === 'latest' || action === 'status_update' || all.length > 0) return { kind: 'in_transit', text: text ?? 'Pakken er på vej' };
  return { kind: 'unknown', text };
}

/** Link til fragtfirmaets sporingsside */
export function trackingUrl(carrier: string | null, trackingNumber: string | null): string | null {
  if (!trackingNumber) return null;
  const n = encodeURIComponent(trackingNumber);
  switch ((carrier ?? '').toLowerCase()) {
    case 'gls': return `https://gls-group.com/DK/da/find-pakke?match=${n}`;
    case 'postnord': case 'pdk': return `https://tracking.postnord.com/dk/?id=${n}`;
    case 'dao': return `https://www.dao.as/privat/find-din-pakke?stregkode=${n}`;
    case 'bring': return `https://tracking.bring.dk/tracking/${n}`;
    default: return null;
  }
}
