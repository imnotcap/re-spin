import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Badge, Notice } from '@respin/ui';
import { can } from '@respin/security';
import { STATUS_LABEL } from '@respin/support';
import { AdminFrame, Panel, kr, when } from '../../../components/AdminFrame';
import { requireDb, requireStaff } from '../../../lib/auth';
import { userStatusAction } from '../../../lib/actions';
import { ORDER_STATUS_LABEL } from '../../../lib/orders';
import { getUser } from '../../../lib/people';
import { ORDER_TONE } from '../../../lib/labels';

export const metadata = { title: 'Bruger' };

export default async function UserPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ spaerret?: string; genaabnet?: string; fejl?: string }> }) {
  const staff = await requireStaff('user.view');
  const { id } = await params;
  const sp = await searchParams;
  const u = await getUser(requireDb(), id);
  if (!u) notFound();
  return (
    <AdminFrame staff={staff} title={u.name} section="users" crumbs={[{ label: 'Brugere', href: '/users' }, { label: u.name }]}
      actions={<Badge tone={u.status === 'active' ? 'forest' : 'coral'}>{u.status === 'active' ? 'Aktiv' : u.status === 'suspended' ? 'Spærret' : 'Slettet'}</Badge>}>
      {sp.spaerret && <Notice icon="check" role="status" className="mb-4">Brugeren er spærret og logget ud på alle enheder.</Notice>}
      {sp.genaabnet && <Notice icon="check" role="status" className="mb-4">Brugeren er genåbnet.</Notice>}
      {sp.fejl && <Notice icon="info" warn role="alert" className="mb-4">Skriv en begrundelse på mindst 5 tegn.</Notice>}
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex flex-col gap-4">
          <Panel title={`Ordrer (${u.orders.length})`} pad={u.orders.length === 0}>
            {u.orders.length === 0 ? <p className="text-small text-muted">Ingen ordrer.</p> : (
              <ul className="divide-y divide-line text-small">
                {u.orders.map((o) => (
                  <li key={o.id}><Link href={`/orders/${o.id}`} className="flex items-center gap-3 px-5 py-2.5 hover:bg-sunken"><span className="min-w-0 flex-1 truncate font-semibold">{o.title}</span><span className="text-muted">{o.buyerId === u.id ? 'Købt' : 'Solgt'}</span><Badge tone={ORDER_TONE[o.status]}>{ORDER_STATUS_LABEL[o.status]}</Badge><span className="tabular-nums">{kr(o.total)}</span></Link></li>
                ))}
              </ul>
            )}
          </Panel>
          <Panel title={`Annoncer (${u.listings.length})`} pad={u.listings.length === 0}>
            {u.listings.length === 0 ? <p className="text-small text-muted">Ingen annoncer.</p> : (
              <ul className="divide-y divide-line text-small">
                {u.listings.map((l) => <li key={l.id} className="flex items-center gap-3 px-5 py-2.5"><span className="min-w-0 flex-1 truncate">{l.title}</span><span className="text-muted">{l.status}</span>{l.moderation !== 'approved' && <Badge tone="warn">{l.moderation === 'pending' ? 'Til gennemgang' : 'Afvist'}</Badge>}<span className="tabular-nums">{kr(l.priceOre)}</span></li>)}
              </ul>
            )}
          </Panel>
          {can(staff.role, 'support.handle') && (
            <Panel title={`Sager (${u.cases.length})`} pad={u.cases.length === 0}>
              {u.cases.length === 0 ? <p className="text-small text-muted">Ingen henvendelser.</p> : (
                <ul className="divide-y divide-line text-small">{u.cases.map((c) => <li key={c.id}><Link href={`/support/${c.id}`} className="flex gap-3 px-5 py-2.5 hover:bg-sunken"><span className="min-w-0 flex-1 truncate font-semibold">#{c.number} {c.subject}</span><span className="text-muted">{STATUS_LABEL[c.status]}</span></Link></li>)}</ul>
              )}
            </Panel>
          )}
        </div>
        <div className="flex flex-col gap-4">
          <Panel title="Oplysninger">
            <dl className="flex flex-col gap-2 text-small">
              <div><dt className="text-muted">E-mail</dt><dd className="break-all">{u.email} {u.verified ? <Badge tone="forest">Bekræftet</Badge> : <Badge tone="warn">Ikke bekræftet</Badge>}</dd></div>
              <div><dt className="text-muted">Profil</dt><dd>{u.username ? `@${u.username}` : '–'}</dd></div>
              <div><dt className="text-muted">Oprettet</dt><dd>{when(u.createdAt)}</dd></div>
              <div><dt className="text-muted">Aktive logins</dt><dd>{u.activeSessions}</dd></div>
              <div><dt className="text-muted">Id</dt><dd className="break-all font-mono text-caption">{u.id}</dd></div>
            </dl>
          </Panel>
          {can(staff.role, 'user.suspend') && u.status !== 'deleted' && (
            <Panel title={u.status === 'active' ? 'Spær bruger' : 'Genåbn bruger'}>
              <form action={userStatusAction} className="flex flex-col gap-2">
                <input type="hidden" name="userId" value={u.id} />
                <input type="hidden" name="status" value={u.status === 'active' ? 'suspended' : 'active'} />
                <label className="text-small font-semibold">Begrundelse<textarea name="reason" rows={3} maxLength={500} required={u.status === 'active'} minLength={u.status === 'active' ? 5 : undefined} className="mt-1 block w-full rounded-md border border-line px-3 py-2 text-small" placeholder="Fx: Gentagne forsøg på betaling uden om Videro" /></label>
                {u.status === 'active' && <p className="text-caption text-muted">Brugeren logges ud overalt og kan ikke logge ind, før spærringen ophæves.</p>}
                <button className={`h-9 rounded-md text-small font-semibold text-white ${u.status === 'active' ? 'bg-coral-600' : 'bg-forest'}`}>{u.status === 'active' ? 'Spær' : 'Genåbn'}</button>
              </form>
            </Panel>
          )}
        </div>
      </div>
    </AdminFrame>
  );
}
