import Link from 'next/link';
import { Badge, EmptyState, Notice } from '@respin/ui';
import { AdminFrame, Panel, ago, kr, when } from '../../components/AdminFrame';
import { requireDb, requireStaff } from '../../lib/auth';
import { decideAction } from '../../lib/actions';
import { MONEY_ACTIONS, isMoneyAction, listApprovals } from '../../lib/orders';

export const metadata = { title: 'Godkendelser' };

const ERR: Record<string, string> = { own_request: 'Du kan ikke godkende din egen anmodning – en kollega skal gøre det.', not_found: 'Anmodningen er allerede afgjort.', failed: 'Handlingen kunne ikke udføres (ordrens status er ændret). Anmodningen venter stadig.' };
const label = (action: string) => { const a = action.replace(/^order\./, ''); return isMoneyAction(a) ? MONEY_ACTIONS[a].label : action; };

export default async function ApprovalsPage({ searchParams }: { searchParams: Promise<{ udfoert?: string; fejl?: string }> }) {
  const staff = await requireStaff('order.refund');
  const sp = await searchParams;
  const db = requireDb();
  const [pending, decided] = await Promise.all([listApprovals(db, 'pending'), listApprovals(db, 'decided')]);
  return (
    <AdminFrame staff={staff} title="Godkendelser" section="approvals">
      <p className="-mt-2 mb-4 max-w-2xl text-small text-muted">Refunderinger og tvistafgørelser fra 1.000 kr. skal godkendes af en anden medarbejder end den, der anmodede. Pengene flyttes først, når de er godkendt.</p>
      {sp.udfoert && <Notice icon="check" role="status" className="mb-4">Afgjort.</Notice>}
      {sp.fejl && <Notice icon="info" warn role="alert" className="mb-4">{ERR[sp.fejl] ?? 'Det lykkedes ikke.'}</Notice>}
      <Panel title={`Venter (${pending.length})`} pad={pending.length === 0}>
        {pending.length === 0 ? <EmptyState icon="check" title="Intet venter" description="Nye anmodninger dukker op her." className="py-6" /> : (
          <ul className="divide-y divide-line">
            {pending.map((a) => {
              const own = a.requestedById === staff.id;
              return (
                <li key={a.id} className="flex flex-col gap-3 p-5 lg:flex-row lg:items-start">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">{label(a.action)} · <span className="tabular-nums">{a.amountOre != null ? kr(a.amountOre) : '–'}</span></p>
                    <p className="text-small text-muted">Anmodet af {a.requestedBy} {ago(a.createdAt)} · <Link className="font-semibold text-forest hover:underline" href={`/orders/${a.targetId}`}>Se ordren</Link></p>
                    <p className="mt-1 text-small">“{a.reason}”</p>
                  </div>
                  {own ? <Badge tone="warn">Din anmodning – en kollega skal godkende</Badge> : (
                    <form action={decideAction} className="flex w-full flex-col gap-2 lg:w-80">
                      <input type="hidden" name="id" value={a.id} />
                      <label className="sr-only" htmlFor={`note-${a.id}`}>Note</label>
                      <input id={`note-${a.id}`} name="note" maxLength={500} placeholder="Note (valgfri)" className="h-9 rounded-md border border-line px-3 text-small" />
                      <div className="flex gap-2">
                        <button name="decision" value="approve" className="h-9 flex-1 rounded-md bg-forest text-small font-semibold text-white">Godkend og udfør</button>
                        <button name="decision" value="reject" className="h-9 flex-1 rounded-md border border-line text-small font-semibold hover:border-ink">Afvis</button>
                      </div>
                    </form>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Panel>
      {decided.length > 0 && (
        <Panel title="Afgjort" className="mt-5" pad={false}>
          <ul className="divide-y divide-line text-small">
            {decided.slice(0, 30).map((a) => (
              <li key={a.id} className="flex flex-wrap items-center gap-2 px-5 py-2.5">
                <Badge tone={a.status === 'approved' ? 'forest' : 'neutral'}>{a.status === 'approved' ? 'Godkendt' : 'Afvist'}</Badge>
                <span>{label(a.action)} · {a.amountOre != null ? kr(a.amountOre) : '–'}</span>
                <span className="text-muted">{a.requestedBy} → {a.decidedBy} · {when(a.decidedAt)}</span>
              </li>
            ))}
          </ul>
        </Panel>
      )}
    </AdminFrame>
  );
}
