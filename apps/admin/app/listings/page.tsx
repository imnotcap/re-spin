import Link from 'next/link';
import { Badge, EmptyState, Notice } from '@respin/ui';
import { CATEGORIES } from '@respin/core/taxonomy';
import { AdminFrame, Panel, ago, kr } from '../../components/AdminFrame';
import { requireDb, requireStaff } from '../../lib/auth';
import { MODERATION_LABEL, PAGE_SIZE, STATUS_LABEL, categoryLabel, searchListings, type ListingFilter } from '../../lib/listings';

export const metadata = { title: 'Annoncer' };

type SP = { q?: string; status?: string; moderation?: string; category?: string; anmeldt?: string; sort?: string; side?: string; slettet?: string };

const MOD_TONE = { pending: 'warn', approved: 'forest', rejected: 'coral' } as const;
const field = 'h-10 rounded-md border border-line bg-surface px-3 text-small';

export default async function ListingsPage({ searchParams }: { searchParams: Promise<SP> }) {
  const staff = await requireStaff('listing.view');
  const sp = await searchParams;
  const f: ListingFilter = { q: sp.q, status: sp.status, moderation: sp.moderation, category: sp.category, reported: sp.anmeldt === '1',
    sort: (['new', 'old', 'views', 'price'] as const).find((s) => s === sp.sort) ?? 'new', page: Math.max(0, Number(sp.side ?? 0) || 0) };
  const { rows, total, page } = await searchListings(requireDb(), f);
  const qs = (patch: Partial<SP>) => {
    const p = new URLSearchParams(Object.entries({ ...sp, slettet: undefined, ...patch }).filter(([, v]) => v) as [string, string][]);
    return `/listings?${p.toString()}`;
  };
  return (
    <AdminFrame staff={staff} title="Annoncer" section="listings">
      {sp.slettet && <Notice icon="check" role="status" className="mb-4">Annoncen er slettet permanent. Det står i audit-loggen.</Notice>}
      <form className="mb-4 flex flex-wrap items-end gap-2" role="search">
        <label className="flex min-w-[220px] flex-1 flex-col gap-1 text-caption font-semibold text-muted">Søg
          <input name="q" defaultValue={sp.q} placeholder="Titel, mærke, sælger, e-mail eller id" className={field} />
        </label>
        <label className="flex flex-col gap-1 text-caption font-semibold text-muted">Status
          <select name="status" defaultValue={sp.status ?? ''} className={field}><option value="">Alle</option>{Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
        </label>
        <label className="flex flex-col gap-1 text-caption font-semibold text-muted">Moderation
          <select name="moderation" defaultValue={sp.moderation ?? ''} className={field}><option value="">Alle</option>{Object.entries(MODERATION_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
        </label>
        <label className="flex flex-col gap-1 text-caption font-semibold text-muted">Kategori
          <select name="category" defaultValue={sp.category ?? ''} className={field}><option value="">Alle</option>{CATEGORIES.map((c) => <option key={c.slug} value={c.slug}>{c.label}</option>)}</select>
        </label>
        <label className="flex flex-col gap-1 text-caption font-semibold text-muted">Sortér
          <select name="sort" defaultValue={f.sort} className={field}><option value="new">Nyeste</option><option value="old">Ældste</option><option value="views">Flest visninger (30 dage)</option><option value="price">Højeste pris</option></select>
        </label>
        <label className="flex h-10 items-center gap-2 text-small"><input type="checkbox" name="anmeldt" value="1" defaultChecked={sp.anmeldt === '1'} className="h-4 w-4" />Kun anmeldte</label>
        <button className="h-10 rounded-md bg-forest px-4 text-small font-semibold text-white">Vis</button>
        {(sp.q || sp.status || sp.moderation || sp.category || sp.anmeldt) && <Link href="/listings" className="h-10 px-2 text-small font-semibold leading-10 text-forest underline underline-offset-4">Nulstil</Link>}
      </form>

      <Panel title={`${total.toLocaleString('da-DK')} ${total === 1 ? 'annonce' : 'annoncer'}`} pad={rows.length === 0}>
        {rows.length === 0 ? <EmptyState icon="tag" title="Ingen annoncer matcher" description="Prøv en anden søgning eller færre filtre." className="py-6" /> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-small">
              <thead className="border-b border-line text-left text-caption uppercase tracking-[0.06em] text-muted">
                <tr><th className="px-5 py-2.5 font-semibold">Annonce</th><th className="px-3 font-semibold">Sælger</th><th className="px-3 font-semibold">Kategori</th><th className="px-3 text-right font-semibold">Pris</th><th className="px-3 font-semibold">Status</th><th className="px-3 text-right font-semibold">Visninger</th><th className="px-5 font-semibold">Oprettet</th></tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rows.map((l) => (
                  <tr key={l.id} className="hover:bg-sunken">
                    <td className="px-5 py-2.5">
                      <Link href={`/listings/${l.id}`} className="flex items-center gap-3">
                        {l.thumb ? <img src={l.thumb} alt="" width={44} height={44} loading="lazy" className="h-11 w-11 shrink-0 rounded-md border border-line object-cover" /> : <span className="h-11 w-11 shrink-0 rounded-md bg-stone-100" />}
                        <span className="min-w-0">
                          <span className="block max-w-[280px] truncate font-semibold">{l.title}</span>
                          <span className="block text-caption text-muted">{l.brand ?? '–'}{l.reports > 0 && <span className="ml-2 font-semibold text-coral-600">⚑ {l.reports} {l.reports === 1 ? 'anmeldelse' : 'anmeldelser'}</span>}</span>
                        </span>
                      </Link>
                    </td>
                    <td className="px-3"><Link href={`/users/${l.sellerId}`} className="hover:underline">{l.sellerName}</Link>{l.sellerStatus !== 'active' && <Badge tone="coral">Spærret</Badge>}</td>
                    <td className="px-3 text-muted">{categoryLabel(l.category)}{l.sub ? <span className="block max-w-[180px] truncate text-caption">{l.sub}</span> : null}</td>
                    <td className="px-3 text-right tabular-nums">{kr(l.priceOre)}</td>
                    <td className="px-3"><span className="flex flex-wrap gap-1"><Badge tone={l.status === 'active' ? 'forest' : 'neutral'}>{STATUS_LABEL[l.status]}</Badge><Badge tone={MOD_TONE[l.moderation]}>{MODERATION_LABEL[l.moderation]}</Badge></span></td>
                    <td className="px-3 text-right tabular-nums">{l.views.toLocaleString('da-DK')}</td>
                    <td className="px-5 text-muted">{ago(l.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
      {(page > 0 || (page + 1) * PAGE_SIZE < total) && (
        <nav aria-label="Sider" className="mt-4 flex items-center justify-between text-small">
          {page > 0 ? <Link href={qs({ side: String(page - 1) })} className="font-semibold text-forest">← Forrige</Link> : <span />}
          <span className="text-muted">Side {page + 1} af {Math.ceil(total / PAGE_SIZE)}</span>
          {(page + 1) * PAGE_SIZE < total ? <Link href={qs({ side: String(page + 1) })} className="font-semibold text-forest">Næste →</Link> : <span />}
        </nav>
      )}
    </AdminFrame>
  );
}
