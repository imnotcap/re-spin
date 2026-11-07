import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Badge } from '@respin/ui';
import { can } from '@respin/security';
import { CATEGORY_LABEL, PRIORITY_LABEL, STATUS_LABEL, SUPPORT_PRIORITIES, SUPPORT_STATUSES, getCase, otherCasesOf, type ThreadMessage } from '@respin/support';
import { AdminFrame, Panel, ago, when } from '../../../components/AdminFrame';
import { Composer } from '../../../components/Composer';
import { AutoRefresh } from '../../../components/AutoRefresh';
import { requireDb, requireStaff } from '../../../lib/auth';
import { updateCaseAction } from '../../../lib/actions';
import { activeStaff } from '../../../lib/people';
import { PRIORITY_TONE, STATUS_TONE } from '../../../lib/labels';

export const metadata = { title: 'Sag' };

function Message({ m }: { m: ThreadMessage }) {
  if (m.authorType === 'system') return <li className="self-center text-caption text-muted">{m.body} · {when(m.createdAt)}</li>;
  const staff = m.authorType === 'staff';
  return (
    <li className={`flex max-w-[85%] flex-col gap-1 ${staff ? 'items-end self-end' : 'items-start self-start'}`}>
      <span className="px-1 text-caption text-muted">
        <span className="font-semibold text-slate-700">{staff ? (m.authorName ?? 'Medarbejder') : 'Kunden'}</span>
        {m.internal && <span className="ml-1.5 rounded-sm bg-amber-100 px-1.5 py-0.5 font-semibold text-amber-900">Intern note</span>} · {when(m.createdAt)}
      </span>
      <p className={`whitespace-pre-line break-words rounded-2xl px-4 py-2.5 text-body ${m.internal ? 'rounded-br-md border border-amber-200 bg-amber-50 text-amber-950' : staff ? 'rounded-br-md bg-forest text-white' : 'rounded-bl-md border border-line bg-surface'}`}>{m.body}</p>
    </li>
  );
}

const select = 'h-9 w-full rounded-md border border-line bg-surface px-2 text-small';

export default async function CasePage({ params }: { params: Promise<{ id: string }> }) {
  const staff = await requireStaff('support.handle');
  const { id } = await params;
  const db = requireDb();
  const c = await getCase(db, id);
  if (!c) notFound();
  const [others, team] = await Promise.all([otherCasesOf(db, c.userId, c.id), activeStaff(db)]);
  const firstName = c.customerName.split(/\s+/)[0] ?? c.customerName;

  return (
    <AdminFrame staff={staff} title={c.subject} section="support" crumbs={[{ label: 'Kundeservice', href: '/support' }, { label: `#${c.number}` }]}
      actions={<span className="flex flex-wrap gap-1.5"><Badge tone={STATUS_TONE[c.status]}>{STATUS_LABEL[c.status]}</Badge><Badge tone={PRIORITY_TONE[c.priority]}>{PRIORITY_LABEL[c.priority]}</Badge>{c.waiting && <Badge tone="coral">Venter på svar</Badge>}</span>}>
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex min-w-0 flex-col gap-4">
          <Panel pad={false}>
            <ol aria-label="Samtale" className="flex flex-col gap-4 p-5">{c.messages.map((m) => <Message key={m.id} m={m} />)}</ol>
          </Panel>
          {c.status === 'closed'
            ? <p className="rounded-lg border border-line bg-surface p-4 text-small text-muted">Sagen er lukket. Kunden kan ikke svare; genåbn den i panelet, hvis der skal skrives mere.</p>
            : <Composer caseId={c.id} customerFirstName={firstName} myName={staff.name ?? 'Kundeservice'} />}
          <AutoRefresh />
        </div>

        <div className="flex flex-col gap-4">
          <Panel title="Sag">
            <form action={updateCaseAction} className="flex flex-col gap-3">
              <input type="hidden" name="caseId" value={c.id} />
              <label className="text-small font-semibold">Status
                <select name="status" defaultValue={c.status} className={`mt-1 ${select}`}>{SUPPORT_STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}</select>
              </label>
              <label className="text-small font-semibold">Prioritet
                <select name="priority" defaultValue={c.priority} className={`mt-1 ${select}`}>{SUPPORT_PRIORITIES.map((p) => <option key={p} value={p}>{PRIORITY_LABEL[p]}</option>)}</select>
              </label>
              <label className="text-small font-semibold">Ejer
                <select name="assigneeId" defaultValue={c.assigneeId ?? ''} className={`mt-1 ${select}`}>
                  <option value="">Ingen</option>
                  {team.map((t) => <option key={t.id} value={t.id}>{t.name ?? t.email}{t.id === staff.id ? ' (mig)' : ''}</option>)}
                </select>
              </label>
              <button className="h-9 rounded-md bg-ink text-small font-semibold text-white">Gem</button>
            </form>
            {c.assigneeId !== staff.id && (
              <form action={updateCaseAction} className="mt-2">
                <input type="hidden" name="caseId" value={c.id} /><input type="hidden" name="assigneeId" value="me" />
                <button className="h-9 w-full rounded-md border border-line text-small font-semibold hover:border-ink">Tildel mig</button>
              </form>
            )}
            <dl className="mt-4 grid grid-cols-2 gap-x-3 gap-y-2 border-t border-line pt-4 text-small">
              <dt className="text-muted">Emne</dt><dd>{CATEGORY_LABEL[c.category]}</dd>
              <dt className="text-muted">Oprettet</dt><dd>{when(c.createdAt)}</dd>
              <dt className="text-muted">Første svar</dt><dd>{c.firstResponseAt ? when(c.firstResponseAt) : 'Endnu ikke'}</dd>
              <dt className="text-muted">Kunden skrev</dt><dd>{ago(c.lastCustomerAt)}</dd>
            </dl>
          </Panel>

          <Panel title="Kunde">
            <p className="font-semibold">{c.customerName}</p>
            <p className="text-small text-muted">{c.customerEmail}</p>
            <p className="mt-1 text-small text-muted">Medlem siden {c.customerSince.toLocaleDateString('da-DK', { month: 'long', year: 'numeric' })}{c.customerStatus !== 'active' && <> · <b className="text-coral-600">{c.customerStatus === 'suspended' ? 'Spærret' : 'Slettet'}</b></>}</p>
            <ul className="mt-3 flex flex-col gap-1 text-small">
              {can(staff.role, 'user.view') && <li><Link className="font-semibold text-forest hover:underline" href={`/users/${c.userId}`}>Se bruger, ordrer og annoncer →</Link></li>}
              {c.orderId && can(staff.role, 'order.view') && <li><Link className="font-semibold text-forest hover:underline" href={`/orders/${c.orderId}`}>Se ordren →</Link></li>}
            </ul>
          </Panel>

          {others.length > 0 && (
            <Panel title="Kundens andre sager" pad={false}>
              <ul className="divide-y divide-line">
                {others.map((o) => (
                  <li key={o.id}><Link href={`/support/${o.id}`} className="block px-5 py-2.5 text-small hover:bg-sunken"><span className="block truncate font-semibold">{o.subject}</span><span className="text-caption text-muted">#{o.number} · {STATUS_LABEL[o.status]} · {ago(o.updatedAt)}</span></Link></li>
                ))}
              </ul>
            </Panel>
          )}
        </div>
      </div>
    </AdminFrame>
  );
}
