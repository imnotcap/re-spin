import Link from 'next/link';
import { Badge, EmptyState } from '@respin/ui';
import { CATEGORY_LABEL, PRIORITY_LABEL, QUEUE_VIEWS, STATUS_LABEL, listCases, queueCounts, type QueueView } from '@respin/support';
import { AdminFrame, ago } from '../../components/AdminFrame';
import { requireDb, requireStaff } from '../../lib/auth';
import { PRIORITY_TONE, STATUS_TONE } from '../../lib/labels';

export const metadata = { title: 'Kundeservice' };

const VIEW_LABEL: Record<QueueView, string> = { mine: 'Mine', unassigned: 'Ikke tildelt', open: 'Åbne', pending: 'Venter på kunden', resolved: 'Løste', all: 'Alle' };

export default async function SupportInbox({ searchParams }: { searchParams: Promise<{ view?: string; q?: string }> }) {
  const staff = await requireStaff('support.handle');
  const sp = await searchParams;
  const view: QueueView = (QUEUE_VIEWS as readonly string[]).includes(sp.view ?? '') ? (sp.view as QueueView) : 'unassigned';
  const q = (sp.q ?? '').slice(0, 100);
  const db = requireDb();
  const [cases, counts] = await Promise.all([listCases(db, { view, staffId: staff.id, q }), queueCounts(db, staff.id)]);
  const badge: Partial<Record<QueueView, number>> = { mine: counts.mine, unassigned: counts.unassigned, open: counts.open, pending: counts.pending };
  const href = (v: QueueView) => `/support?view=${v}${q ? `&q=${encodeURIComponent(q)}` : ''}`;

  return (
    <AdminFrame staff={staff} title="Kundeservice" section="support">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <nav aria-label="Køer" className="flex flex-wrap gap-1 rounded-lg border border-line bg-surface p-1">
          {QUEUE_VIEWS.map((v) => (
            <Link key={v} href={href(v)} aria-current={v === view ? 'page' : undefined}
              className={`inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-small font-semibold ${v === view ? 'bg-ink text-white' : 'text-slate-700 hover:bg-sunken'}`}>
              {VIEW_LABEL[v]}{badge[v] ? <span className={`rounded-pill px-1.5 text-caption tabular-nums ${v === view ? 'bg-white/20' : 'bg-stone-100'}`}>{badge[v]}</span> : null}
            </Link>
          ))}
        </nav>
        <form action="/support" className="flex gap-2" role="search">
          <input type="hidden" name="view" value={view} />
          <label htmlFor="q" className="sr-only">Søg i sager</label>
          <input id="q" name="q" defaultValue={q} placeholder="Søg: #1042, e-mail, navn, emne" className="h-10 w-72 max-w-full rounded-md border border-line bg-surface px-3 text-small" />
          <button className="h-10 rounded-md bg-forest px-4 text-small font-semibold text-white">Søg</button>
        </form>
      </div>

      <div className="mt-4 overflow-hidden rounded-lg border border-line bg-surface">
        {cases.length === 0 ? (
          <EmptyState icon="check" title={q ? 'Ingen sager matcher søgningen' : 'Ingen sager her'} description={view === 'unassigned' ? 'Alle nye henvendelser har en ejer.' : 'Prøv en anden kø.'} className="py-12" />
        ) : (
          <table className="w-full text-left text-small">
            <thead className="border-b border-line bg-sunken text-caption uppercase tracking-[0.06em] text-muted">
              <tr><th className="px-4 py-2.5 font-semibold">Sag</th><th className="hidden px-4 py-2.5 font-semibold md:table-cell">Kunde</th><th className="px-4 py-2.5 font-semibold">Status</th><th className="hidden px-4 py-2.5 font-semibold lg:table-cell">Ejer</th><th className="px-4 py-2.5 text-right font-semibold">Seneste</th></tr>
            </thead>
            <tbody className="divide-y divide-line">
              {cases.map((c) => (
                <tr key={c.id} className="hover:bg-sunken">
                  <td className="max-w-0 px-4 py-3">
                    <Link href={`/support/${c.id}`} className="block">
                      <span className="flex items-center gap-2">
                        {c.waiting && <span className="h-2 w-2 shrink-0 rounded-full bg-coral-600" title="Kunden venter på svar" aria-label="Kunden venter på svar" />}
                        <span className="truncate font-semibold text-ink">{c.subject}</span>
                      </span>
                      <span className="mt-0.5 block truncate text-caption text-muted">#{c.number} · {CATEGORY_LABEL[c.category]}</span>
                    </Link>
                  </td>
                  <td className="hidden px-4 py-3 md:table-cell"><span className="block truncate">{c.customerName}</span><span className="block truncate text-caption text-muted">{c.customerEmail}</span></td>
                  <td className="px-4 py-3"><span className="flex flex-wrap gap-1"><Badge tone={STATUS_TONE[c.status]}>{STATUS_LABEL[c.status]}</Badge>{c.priority !== 'normal' && <Badge tone={PRIORITY_TONE[c.priority]}>{PRIORITY_LABEL[c.priority]}</Badge>}</span></td>
                  <td className="hidden px-4 py-3 text-slate-700 lg:table-cell">{c.assigneeName ?? <span className="text-muted">Ingen</span>}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-right text-muted">{ago(c.lastCustomerAt && (!c.lastStaffAt || c.lastCustomerAt > c.lastStaffAt) ? c.lastCustomerAt : c.updatedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </AdminFrame>
  );
}
