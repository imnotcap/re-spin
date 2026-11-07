import Link from 'next/link';
import { Badge, EmptyState } from '@respin/ui';
import { ORDER_STATUSES } from '@respin/core';
import { AdminFrame, kr, when } from '../../components/AdminFrame';
import { requireDb, requireStaff } from '../../lib/auth';
import { ORDER_STATUS_LABEL, listOrders } from '../../lib/orders';
import { ORDER_TONE } from '../../lib/labels';

export const metadata = { title: 'Ordrer' };

export default async function OrdersPage({ searchParams }: { searchParams: Promise<{ status?: string; q?: string }> }) {
  const staff = await requireStaff('order.view');
  const sp = await searchParams;
  const status = (ORDER_STATUSES as readonly string[]).includes(sp.status ?? '') ? sp.status : undefined;
  const q = (sp.q ?? '').slice(0, 100);
  const rows = await listOrders(requireDb(), { status, q });
  return (
    <AdminFrame staff={staff} title="Ordrer" section="orders">
      <form action="/orders" className="flex flex-wrap gap-2" role="search">
        <label htmlFor="status" className="sr-only">Status</label>
        <select id="status" name="status" defaultValue={status ?? ''} className="h-10 rounded-md border border-line bg-surface px-3 text-small">
          <option value="">Alle statusser</option>
          {ORDER_STATUSES.map((s) => <option key={s} value={s}>{ORDER_STATUS_LABEL[s]}</option>)}
        </select>
        <label htmlFor="q" className="sr-only">Søg</label>
        <input id="q" name="q" defaultValue={q} placeholder="Ordre-id, vare, køber eller sælger" className="h-10 w-80 max-w-full rounded-md border border-line bg-surface px-3 text-small" />
        <button className="h-10 rounded-md bg-forest px-4 text-small font-semibold text-white">Søg</button>
      </form>
      <div className="mt-4 overflow-hidden rounded-lg border border-line bg-surface">
        {rows.length === 0 ? <EmptyState icon="package" title="Ingen ordrer" description={q || status ? 'Ingen ordrer matcher filteret.' : 'Der er ingen ordrer endnu.'} className="py-12" /> : (
          <table className="w-full text-left text-small">
            <thead className="border-b border-line bg-sunken text-caption uppercase tracking-[0.06em] text-muted">
              <tr><th className="px-4 py-2.5 font-semibold">Vare</th><th className="hidden px-4 py-2.5 font-semibold md:table-cell">Køber → sælger</th><th className="px-4 py-2.5 font-semibold">Status</th><th className="px-4 py-2.5 text-right font-semibold">Beløb</th><th className="hidden px-4 py-2.5 text-right font-semibold lg:table-cell">Opdateret</th></tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((o) => (
                <tr key={o.id} className="hover:bg-sunken">
                  <td className="max-w-0 px-4 py-3"><Link href={`/orders/${o.id}`} className="block truncate font-semibold">{o.listingTitle}</Link><span className="block truncate font-mono text-caption text-muted">{o.id.slice(0, 8)}</span></td>
                  <td className="hidden px-4 py-3 md:table-cell"><span className="block truncate">{o.buyerName} → {o.sellerName}</span></td>
                  <td className="px-4 py-3"><Badge tone={ORDER_TONE[o.status]}>{ORDER_STATUS_LABEL[o.status]}</Badge></td>
                  <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums">{kr(o.buyerTotalOre)}</td>
                  <td className="hidden whitespace-nowrap px-4 py-3 text-right text-muted lg:table-cell">{when(o.updatedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </AdminFrame>
  );
}
