import { and, eq } from 'drizzle-orm';
import { schema } from '@respin/db';
import { getCurrentSession } from '../../../../../lib/auth';
import { getDb } from '../../../../../lib/server';
import { getShipmondoOrNull } from '../../../../../lib/shipping';

export const dynamic = 'force-dynamic';

/** Fragtlabel som PDF – kun for sælgeren på ordren. Hentes direkte fra Shipmondo (gemmes ikke hos os). */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const s = await getCurrentSession().catch(() => null);
  const client = getShipmondoOrNull();
  if (!s || !client || !/^[0-9a-f-]{36}$/.test(id)) return new Response('Ikke fundet', { status: 404 });
  const [o] = await getDb().select({ shipment: schema.orders.shipmondoShipmentId }).from(schema.orders)
    .where(and(eq(schema.orders.id, id), eq(schema.orders.sellerId, s.user.id)));
  if (!o?.shipment) return new Response('Ikke fundet', { status: 404 });
  const label = await client.label(o.shipment).catch(() => null);
  if (!label) return new Response('Labelen er ikke klar endnu. Prøv igen om lidt.', { status: 503 });
  return new Response(new Uint8Array(label.pdf), { headers: {
    'Content-Type': 'application/pdf', 'Content-Disposition': `inline; filename="videro-fragtlabel-${id.slice(0, 8)}.pdf"`,
    'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff'
  } });
}
