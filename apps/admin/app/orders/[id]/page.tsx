import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Badge, Notice } from '@respin/ui';
import { can, needsSecondApproval } from '@respin/security';
import { AdminFrame, Panel, kr, when } from '../../../components/AdminFrame';
import { MoneyForm } from '../../../components/MoneyForm';
import { requireDb, requireStaff } from '../../../lib/auth';
import { MONEY_ACTIONS, ORDER_STATUS_LABEL, getOrder, type MoneyAction } from '../../../lib/orders';
import { ORDER_TONE } from '../../../lib/labels';

export const metadata = { title: 'Ordre' };

const ACTOR: Record<string, string> = { buyer: 'Køber', seller: 'Sælger', admin: 'Medarbejder', system: 'System' };

export default async function OrderPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ udfoert?: string; anmodet?: string }> }) {
  const staff = await requireStaff('order.view');
  const { id } = await params;
  const sp = await searchParams;
  const o = await getOrder(requireDb(), id);
  if (!o) notFound();
  const { order } = o;
  const actions = (Object.entries(MONEY_ACTIONS) as Array<[MoneyAction, (typeof MONEY_ACTIONS)[MoneyAction]]>)
    .filter(([, d]) => (d.from as readonly string[]).includes(order.status) && can(staff.role, d.permission))
    .map(([k, d]) => ({ id: k, label: d.label, permission: d.permission }));
  const pendingApproval = o.approvals.find((a) => a.status === 'pending');

  return (
    <AdminFrame staff={staff} title={o.listingTitle} section="orders" crumbs={[{ label: 'Ordrer', href: '/orders' }, { label: order.id.slice(0, 8) }]}
      actions={<Badge tone={ORDER_TONE[order.status]}>{ORDER_STATUS_LABEL[order.status]}</Badge>}>
      {sp.udfoert && <Notice icon="check" role="status" className="mb-4">Udført. Ordren er opdateret, og refunderingen sendes til Stripe.</Notice>}
      {sp.anmodet && <Notice icon="info" role="status" className="mb-4">Beløbet kræver to personer. Anmodningen venter nu på en kollegas godkendelse under Godkendelser.</Notice>}
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex flex-col gap-4">
          <Panel title="Beløb">
            <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-small sm:grid-cols-3">
              <div><dt className="text-muted">Varepris</dt><dd className="tabular-nums">{kr(order.priceOre)}</dd></div>
              <div><dt className="text-muted">Køberbeskyttelse</dt><dd className="tabular-nums">{kr(order.buyerFeeOre)}</dd></div>
              <div><dt className="text-muted">Fragt</dt><dd className="tabular-nums">{kr(order.shippingOre)}</dd></div>
              <div><dt className="text-muted">Køber betalte</dt><dd className="font-bold tabular-nums">{kr(order.buyerTotalOre)}</dd></div>
              <div><dt className="text-muted">Sælgergebyr</dt><dd className="tabular-nums">{kr(order.sellerFeeOre)}</dd></div>
              <div><dt className="text-muted">Sælger får</dt><dd className="font-bold tabular-nums">{kr(order.sellerPayoutOre)}</dd></div>
            </dl>
          </Panel>
          <Panel title="Tidslinje">
            <ol className="relative flex flex-col gap-4 border-l border-line pl-5">
              <li className="text-small"><span className="absolute -left-[5px] mt-1.5 h-2.5 w-2.5 rounded-full bg-stone-300" /><b>Oprettet</b> · {when(order.createdAt)}</li>
              {o.events.map((e) => (
                <li key={e.id} className="text-small">
                  <span className="absolute -left-[5px] mt-1.5 h-2.5 w-2.5 rounded-full bg-forest" />
                  <b>{ORDER_STATUS_LABEL[e.toStatus]}</b> · {when(e.createdAt)} · <span className="text-muted">{ACTOR[e.actorType] ?? e.actorType} ({e.event})</span>
                  {typeof (e.metadata as { reason?: unknown }).reason === 'string' && <p className="mt-0.5 text-muted">“{(e.metadata as { reason: string }).reason}”</p>}
                </li>
              ))}
            </ol>
          </Panel>
          {o.approvals.length > 0 && (
            <Panel title="Godkendelser">
              <ul className="flex flex-col gap-2 text-small">
                {o.approvals.map((a) => <li key={a.id}><Badge tone={a.status === 'pending' ? 'warn' : a.status === 'approved' ? 'forest' : 'neutral'}>{a.status === 'pending' ? 'Venter' : a.status === 'approved' ? 'Godkendt' : 'Afvist'}</Badge> {a.action.replace('order.', '')} · anmodet af {a.requestedBy} {when(a.createdAt)} – “{a.reason}”</li>)}
              </ul>
            </Panel>
          )}
        </div>
        <div className="flex flex-col gap-4">
          <Panel title="Parter">
            <dl className="flex flex-col gap-3 text-small">
              <div><dt className="text-muted">Køber</dt><dd>{can(staff.role, 'user.view') ? <Link className="font-semibold text-forest hover:underline" href={`/users/${o.buyerId}`}>{o.buyerName}</Link> : o.buyerName} <span className="text-muted">{o.buyerEmail}</span></dd></div>
              <div><dt className="text-muted">Sælger</dt><dd>{can(staff.role, 'user.view') ? <Link className="font-semibold text-forest hover:underline" href={`/users/${o.sellerId}`}>{o.sellerName}</Link> : o.sellerName} <span className="text-muted">{o.sellerEmail}</span></dd></div>
              <div><dt className="text-muted">Stripe</dt><dd className="break-all font-mono text-caption">{order.stripePaymentIntentId ?? '–'}</dd></div>
            </dl>
          </Panel>
          {actions.length > 0 && (
            <Panel title="Penge tilbage eller frem">
              {pendingApproval
                ? <p className="text-small">En anmodning venter på godkendelse. {can(staff.role, 'order.refund') && <Link href="/approvals" className="font-semibold text-forest hover:underline">Se godkendelser →</Link>}</p>
                : <MoneyForm orderId={order.id} actions={actions.map(({ id: a, label }) => ({ id: a, label }))} needsApproval={needsSecondApproval(actions[0]!.permission, order.buyerTotalOre)} />}
            </Panel>
          )}
        </div>
      </div>
    </AdminFrame>
  );
}
