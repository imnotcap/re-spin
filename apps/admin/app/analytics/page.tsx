import Link from 'next/link';
import { AdminFrame, Panel } from '../../components/AdminFrame';
import { Bars, Kpi, Lines, RankList, pctChange } from '../../components/Charts';
import { requireDb, requireStaff } from '../../lib/auth';
import { CLICK_LABEL, PERIODS, analytics, type Period } from '../../lib/analytics';
import { categoryLabel } from '../../lib/listings';

export const metadata = { title: 'Statistik' };

const n = (v: number) => v.toLocaleString('da-DK');
const pct = (a: number, b: number) => (b > 0 ? `${Math.round((a / b) * 100)} %` : '–');
const DEVICE: Record<string, string> = { mobile: 'Mobil', tablet: 'Tablet', desktop: 'Computer' };
const PAGE_LABEL = (p: string) => p === '/' ? 'Forside' : p.startsWith('/kategori/') ? `Kategori: ${categoryLabel(p.split('/')[2] ?? '')}` : p.startsWith('/annonce/') ? 'Annonce' : p.startsWith('/soeg/') ? 'Søg' : p.startsWith('/saelg/') ? 'Sælg' : p.startsWith('/favoritter/') ? 'Favoritter' : p.startsWith('/@/') || p.startsWith('/profil/') ? 'Profil' : p;

export default async function AnalyticsPage({ searchParams }: { searchParams: Promise<{ dage?: string }> }) {
  const staff = await requireStaff('analytics.view');
  const sp = await searchParams;
  const days = (PERIODS.find((p) => String(p) === sp.dage) ?? 30) as Period;
  const a = await analytics(requireDb(), days);
  const t = a.totals;
  const maxHour = Math.max(1, ...a.hours);
  const devTotal = a.devices.reduce((s, d) => s + d.n, 0);

  return (
    <AdminFrame staff={staff} title="Statistik" section="analytics" actions={
      <nav aria-label="Periode" className="flex gap-1 rounded-md border border-line bg-surface p-1">
        {PERIODS.map((p) => <Link key={p} href={`/analytics?dage=${p}`} aria-current={p === days ? 'page' : undefined} className={`rounded px-3 py-1.5 text-small font-semibold ${p === days ? 'bg-forest text-white' : 'text-slate-700 hover:bg-sunken'}`}>{p} dage</Link>)}
      </nav>
    }>
      <p className="mb-4 max-w-3xl text-small text-muted">Tal fra hjemmesiden uden cookies og uden IP-adresser. "Besøgende" er unikke pr. dag og lagt sammen for perioden. Browsere med "Global Privacy Control" eller "Do Not Track" tælles ikke, og bots og målinger frasorteres.</p>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Sidevisninger" value={n(t.pageviews)} change={pctChange(t.pageviews, t.prevPageviews)} note={`mod forrige ${days} dage`} />
        <Kpi label="Besøgende" value={n(t.visitors)} note={`${t.visitors ? (t.pageviews / t.visitors).toFixed(1).replace('.', ',') : '0'} sider pr. besøg`} />
        <Kpi label="Annoncevisninger" value={n(t.listingViews)} change={pctChange(t.listingViews, t.prevListingViews)} note="visninger af annoncer" />
        <Kpi label="Søgninger" value={n(t.searches)} note={`${n(a.zeroResults.reduce((s, z) => s + z.n, 0))} uden resultater`} />
        <Kpi label="Klik" value={n(t.clicks)} note="knapper og varekort" />
        <Kpi label="Hjerter" value={n(t.favorites)} note="varer gemt som favorit" />
        <Kpi label="Nye brugere" value={n(a.funnel.signups)} note={`på ${days} dage`} href="/users" />
        <Kpi label="Nye annoncer" value={n(a.funnel.listingsCreated)} note={`på ${days} dage`} href="/listings" />
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Panel title="Trafik pr. dag">
          <Lines series={a.daily.map((d) => ({ day: d.day, a: d.pageviews, b: d.visitors }))} a="Sidevisninger" b="Besøgende" label="Sidevisninger og besøgende" />
        </Panel>
        <Panel title="Fra besøg til salg">
          <ol className="flex flex-col gap-2 text-small">
            {[
              ['Besøgende (unikke pr. dag)', a.funnel.visitors, null],
              ['Så mindst én annonce', a.funnel.viewers, a.funnel.visitors],
              ['Gemte en favorit', a.funnel.favoriters, a.funnel.visitors],
              ['Var på "Sælg"-siden', a.funnel.sellPage, a.funnel.visitors],
              ['Nye annoncer', a.funnel.listingsCreated, null],
              ['Nye brugere', a.funnel.signups, null]
            ].map(([label, v, of]) => (
              <li key={label as string} className="flex items-center justify-between gap-3 rounded-md bg-sunken px-3 py-2">
                <span>{label}</span><span className="font-semibold tabular-nums">{n(v as number)}{of != null && <span className="ml-2 font-normal text-muted">{pct(v as number, of as number)}</span>}</span>
              </li>
            ))}
          </ol>
        </Panel>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Panel title="Mest sete annoncer">
          <RankList rows={a.listings.map((l) => ({ key: l.id, label: l.title ?? 'Slettet annonce', value: l.views, href: l.title ? `/listings/${l.id}` : undefined, note: `${n(l.visitors)} unikke · ♥ ${n(l.favorites)} · ${n(l.clicks)} klik` }))} empty="Ingen annoncevisninger i perioden." unit="vis." />
        </Panel>
        <Panel title="Mest besøgte sider">
          <RankList rows={a.pages.map((p) => ({ key: p.path, label: <span title={p.path}>{PAGE_LABEL(p.path)} <span className="text-caption text-muted">{p.path.length > 40 ? `${p.path.slice(0, 40)}…` : p.path}</span></span>, value: p.n, note: `${n(p.visitors)} unikke` }))} empty="Ingen sidevisninger i perioden." />
        </Panel>
        <Panel title="Det søger folk efter">
          <RankList rows={a.searches.map((s) => ({ key: s.q, label: `“${s.q}”`, value: s.n, note: `≈ ${n(s.results)} resultater` }))} empty="Ingen søgninger i perioden." unit="×" />
        </Panel>
        <Panel title="Søgninger uden resultater">
          <p className="mb-3 text-caption text-muted">Varer folk leder efter, men ikke finder – gode emner til opslag og markedsføring.</p>
          <RankList rows={a.zeroResults.map((s) => ({ key: s.q, label: `“${s.q}”`, value: s.n }))} empty="Alle søgninger gav resultater." unit="×" />
        </Panel>
        <Panel title="Klik">
          <RankList rows={a.clicks.map((c) => ({ key: c.target, label: CLICK_LABEL[c.target] ?? c.target, value: c.n }))} empty="Ingen klik i perioden." />
        </Panel>
        <Panel title="Kategorier">
          <RankList rows={[...a.categories].sort((x, y) => (y.views + y.listingViews) - (x.views + x.listingViews)).map((c) => ({ key: c.category, label: categoryLabel(c.category), value: c.views + c.listingViews, note: `${n(c.views)} på kategorisiden · ${n(c.listingViews)} annoncevisninger` }))} />
        </Panel>
        <Panel title="Hvor kommer de fra?">
          <RankList rows={a.referrers.map((r) => ({ key: r.host ?? 'direkte', label: r.host ?? 'Direkte eller ukendt', value: r.n }))} empty="Ingen data endnu." />
        </Panel>
        <Panel title="Enheder og tidspunkt">
          <div className="flex gap-2">
            {a.devices.map((d) => (
              <div key={d.device} className="flex-1 rounded-md bg-sunken p-3">
                <p className="text-caption text-muted">{DEVICE[d.device] ?? d.device}</p>
                <p className="text-[22px] font-bold tabular-nums">{pct(d.n, devTotal)}</p>
              </div>
            ))}
            {a.devices.length === 0 && <p className="text-small text-muted">Ingen data endnu.</p>}
          </div>
          <p className="mt-4 text-small font-semibold">Sidevisninger efter klokkeslæt</p>
          <div aria-hidden="true" className="mt-2 flex h-20 items-end gap-[3px]">
            {a.hours.map((v, h) => <div key={h} title={`kl. ${h}: ${v}`} className="flex-1 rounded-t-sm bg-forest/70" style={{ height: `${Math.max(v ? 4 : 1, (v / maxHour) * 80)}px` }} />)}
          </div>
          <div aria-hidden="true" className="mt-1 flex justify-between text-caption text-muted"><span>00</span><span>06</span><span>12</span><span>18</span><span>23</span></div>
          <table className="sr-only"><caption>Sidevisninger efter klokkeslæt</caption><tbody>{a.hours.map((v, h) => <tr key={h}><th scope="row">kl. {h}</th><td>{v}</td></tr>)}</tbody></table>
        </Panel>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Panel title="Nye brugere pr. dag"><Bars series={a.growth.map((g) => ({ day: g.day, value: g.users }))} label="Nye brugere" /></Panel>
        <Panel title="Nye annoncer pr. dag"><Bars series={a.growth.map((g) => ({ day: g.day, value: g.listings }))} label="Nye annoncer" tone="slate" /></Panel>
      </div>
    </AdminFrame>
  );
}
