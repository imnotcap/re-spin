import Link from 'next/link';
import { Notice } from '@respin/ui';
import { can } from '@respin/security';
import { supportStats } from '@respin/support';
import { AdminFrame, Panel, kr } from '../components/AdminFrame';
import { db, requireStaff } from '../lib/auth';
import { pendingApprovalCount } from '../lib/orders';
import { dailySeries, dashboardStats } from '../lib/people';

export const metadata = { title: 'Oversigt' };

function Kpi({ label, value, note, href, alert }: { label: string; value: string; note?: string; href?: string; alert?: boolean }) {
  const body = (
    <>
      <p className="text-caption font-semibold uppercase tracking-[0.08em] text-muted">{label}</p>
      <p className={`mt-1 text-[28px] font-bold leading-tight tabular-nums ${alert ? 'text-coral-600' : ''}`}>{value}</p>
      {note && <p className="mt-0.5 text-small text-muted">{note}</p>}
    </>
  );
  return href
    ? <Link href={href} className="block rounded-lg border border-line bg-surface p-4 hover:border-slate">{body}</Link>
    : <div className="rounded-lg border border-line bg-surface p-4">{body}</div>;
}

/** Søjler for de seneste 14 dage – med en tabel bagved for skærmlæsere */
function Bars({ series, k, label }: { series: Array<{ day: string } & Record<'users' | 'listings' | 'cases', number>>; k: 'users' | 'listings' | 'cases'; label: string }) {
  const max = Math.max(1, ...series.map((d) => d[k]));
  const total = series.reduce((s, d) => s + d[k], 0);
  return (
    <figure>
      <figcaption className="flex items-baseline justify-between text-small"><span className="font-semibold">{label}</span><span className="tabular-nums text-muted">{total} i alt</span></figcaption>
      <div aria-hidden="true" className="mt-3 flex h-24 items-end gap-1">
        {series.map((d) => (
          <div key={d.day} className="group relative flex-1">
            <div className="rounded-t-sm bg-forest/80 group-hover:bg-forest" style={{ height: `${Math.max(d[k] ? 6 : 2, (d[k] / max) * 96)}px` }} />
          </div>
        ))}
      </div>
      <div aria-hidden="true" className="mt-1 flex justify-between text-caption text-muted"><span>{series[0]?.day.slice(5)}</span><span>i dag</span></div>
      <table className="sr-only"><caption>{label} pr. dag</caption><tbody>{series.map((d) => <tr key={d.day}><th scope="row">{d.day}</th><td>{d[k]}</td></tr>)}</tbody></table>
    </figure>
  );
}

export default async function Dashboard() {
  const staff = await requireStaff();
  const d = db();
  if (!d) {
    return <AdminFrame staff={staff} title="Oversigt" section="overview"><Notice icon="info" warn>Der er ingen database forbundet, så der er ingen tal at vise.</Notice></AdminFrame>;
  }
  const [st, series, sup, approvals] = await Promise.all([dashboardStats(d), dailySeries(d, 14), supportStats(d, new Date(Date.now() - 7 * 86_400_000)), can(staff.role, 'order.refund') ? pendingApprovalCount(d) : Promise.resolve(0)]);
  const firstResponse = sup.medianFirstResponseMin == null ? '–' : sup.medianFirstResponseMin < 60 ? `${sup.medianFirstResponseMin} min.` : `${Math.round(sup.medianFirstResponseMin / 60)} t.`;

  return (
    <AdminFrame staff={staff} title={`Hej${staff.name ? ` ${staff.name}` : ''}`} section="overview">
      <h2 className="sr-only">Arbejdskøer</h2>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {can(staff.role, 'support.handle') && <Kpi label="Sager uden ejer" value={String(st.support.unassigned)} note={`${st.support.open} åbne i alt`} href="/support?view=unassigned" alert={st.support.unassigned > 0} />}
        {can(staff.role, 'support.handle') && <Kpi label="Ventet over 24 t." value={String(st.support.waitingOver24h)} note="Kunden venter på svar" href="/support?view=open" alert={st.support.waitingOver24h > 0} />}
        {can(staff.role, 'report.handle') && <Kpi label="Til gennemgang" value={String(st.listings.pending + st.reports)} note={`${st.listings.pending} ${st.listings.pending === 1 ? 'annonce' : 'annoncer'} · ${st.reports} ${st.reports === 1 ? 'anmeldelse' : 'anmeldelser'}`} href="/moderation" />}
        {can(staff.role, 'order.refund') && <Kpi label="Venter på godkendelse" value={String(approvals)} note="Refunderinger fra 1.000 kr." href="/approvals" alert={approvals > 0} />}
        {can(staff.role, 'order.view') && <Kpi label="Tvister" value={String(st.orders.disputed)} note={`${st.orders.inProgress} ordrer i gang`} href="/orders?status=disputed" alert={st.orders.disputed > 0} />}
      </div>

      <h2 className="mt-8 text-body font-bold">De seneste 30 dage</h2>
      <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Omsætning (varer)" value={kr(st.orders.gmv30)} note={`${st.orders.count30} betalte ordrer`} />
        <Kpi label="Fremhævninger" value={kr(st.promotions.revenue30)} note={`${st.promotions.active} aktive nu`} />
        <Kpi label="Brugere" value={st.users.total.toLocaleString('da-DK')} note={`+${st.users.new7} på 7 dage · ${st.users.suspended} spærret`} href={can(staff.role, 'user.view') ? '/users' : undefined} />
        <Kpi label="Aktive annoncer" value={st.listings.active.toLocaleString('da-DK')} note={`+${st.listings.new7} på 7 dage`} />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Panel title="Aktivitet – 14 dage">
          <div className="grid gap-6 sm:grid-cols-3">
            <Bars series={series} k="users" label="Nye brugere" />
            <Bars series={series} k="listings" label="Nye annoncer" />
            <Bars series={series} k="cases" label="Nye sager" />
          </div>
        </Panel>
        <Panel title="Kundeservice – 7 dage">
          <dl className="grid grid-cols-2 gap-4">
            <div><dt className="text-small text-muted">Nye sager</dt><dd className="text-[22px] font-bold tabular-nums">{sup.created}</dd></div>
            <div><dt className="text-small text-muted">Løste sager</dt><dd className="text-[22px] font-bold tabular-nums">{sup.resolved}</dd></div>
            <div className="col-span-2"><dt className="text-small text-muted">Første svar (median)</dt><dd className="text-[22px] font-bold tabular-nums">{firstResponse}</dd></div>
          </dl>
        </Panel>
      </div>
      <p className="mt-6 text-caption text-muted">Alle handlinger i admin logges med navn, tidspunkt og IP i audit-loggen.</p>
    </AdminFrame>
  );
}
