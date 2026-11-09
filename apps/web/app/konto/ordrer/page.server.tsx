import Link from 'next/link';
import { Badge, EmptyState } from '@respin/ui';
import { formatOre, ore } from '@respin/core/money';
import { AuthPage } from '../../../components/AuthPage';
import { requireSession } from '../../../lib/auth';
import { getDb } from '../../../lib/server';
import { getImageStore } from '../../../lib/image-store';
import { STATUS_LABEL, myOrders } from '../../../lib/orders';

export const metadata = { title: 'Køb og salg', robots: { index: false } };

const fmt = (d: Date) => d.toLocaleDateString('da-DK', { day: 'numeric', month: 'short', timeZone: 'Europe/Copenhagen' });

export default async function OrdersPage({ searchParams }: { searchParams: Promise<{ vis?: string }> }) {
  const current = await requireSession('/konto/ordrer/');
  const tab = (await searchParams).vis === 'salg' ? 'seller' : 'buyer';
  const all = await myOrders(getDb(), getImageStore(), current.user.id);
  const rows = all.filter((r) => r.role === tab);
  const count = (role: 'buyer' | 'seller') => all.filter((r) => r.role === role && r.needsAction).length;
  const tabCls = (on: boolean) => `rounded-pill px-4 py-2 text-small font-semibold ${on ? 'bg-ink text-white' : 'border border-line text-slate-700 hover:border-slate'}`;
  return (
    <AuthPage width="page" title="Køb og salg" crumbs={[{ label: 'Min konto', href: '/konto/' }, { label: 'Køb og salg' }]}>
      <nav aria-label="Vis" className="flex gap-2">
        <Link href="/konto/ordrer/" aria-current={tab === 'buyer' ? 'page' : undefined} className={tabCls(tab === 'buyer')}>Mine køb{count('buyer') ? ` (${count('buyer')})` : ''}</Link>
        <Link href="/konto/ordrer/?vis=salg" aria-current={tab === 'seller' ? 'page' : undefined} className={tabCls(tab === 'seller')}>Mine salg{count('seller') ? ` (${count('seller')})` : ''}</Link>
      </nav>
      {rows.length === 0 ? (
        <EmptyState icon={tab === 'buyer' ? 'bag' : 'tag'} title={tab === 'buyer' ? 'Ingen køb endnu' : 'Ingen salg endnu'} className="py-12"
          description={tab === 'buyer' ? 'Når du køber en vare, kan du følge den her – fra betaling til levering.' : 'Når du sælger en vare, finder du køberens adresse og frist for afsendelse her.'} />
      ) : (
        <ul className="divide-y divide-line rounded-lg border border-line">
          {rows.map((r) => (
            <li key={r.id}>
              <Link href={`/konto/ordrer/${r.id}/`} className="flex items-center gap-4 p-4 hover:bg-sunken">
                {r.image ? <img src={r.image} alt="" width={56} height={56} loading="lazy" className="h-14 w-14 shrink-0 rounded-md border border-line object-cover" /> : <span className="h-14 w-14 shrink-0 rounded-md bg-stone-100" />}
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{r.title}</span>
                  <span className="block text-small text-muted">{r.role === 'buyer' ? `Fra ${r.otherName}` : `Til ${r.otherName}`} · {fmt(r.createdAt)}</span>
                  <span className="mt-1 flex flex-wrap items-center gap-2">
                    <Badge tone={r.needsAction ? 'coral' : r.status === 'completed' ? 'forest' : 'neutral'}>{r.needsAction ? (r.role === 'seller' ? 'Send varen' : 'Bekræft modtagelse') : STATUS_LABEL[r.status]}</Badge>
                  </span>
                </span>
                <span className="shrink-0 text-right font-semibold tabular-nums">{formatOre(ore(r.role === 'buyer' ? r.totalOre : r.payoutOre))}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </AuthPage>
  );
}
