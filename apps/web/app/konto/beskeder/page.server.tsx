import Link from 'next/link';
import { Badge, EmptyState } from '@respin/ui';
import { AuthPage } from '../../../components/AuthPage';
import { AutoRefresh } from '../../../components/support/AutoRefresh';
import { requireSession } from '../../../lib/auth';
import { getDb } from '../../../lib/server';
import { getImageStore } from '../../../lib/image-store';
import { inbox } from '../../../lib/conversations';

export const metadata = { title: 'Beskeder', robots: { index: false } };

const when = (d: Date) => {
  const days = Math.floor((Date.now() - d.getTime()) / 86_400_000);
  return days === 0 ? d.toLocaleTimeString('da-DK', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Copenhagen' }) : days === 1 ? 'I går' : d.toLocaleDateString('da-DK', { day: 'numeric', month: 'short', timeZone: 'Europe/Copenhagen' });
};

export default async function InboxPage() {
  const current = await requireSession('/konto/beskeder/');
  const rows = await inbox(getDb(), getImageStore(), current.user.id);
  return (
    <AuthPage width="page" title="Beskeder" crumbs={[{ label: 'Min konto', href: '/konto/' }, { label: 'Beskeder' }]}>
      {rows.length === 0 ? (
        <EmptyState icon="chat" title="Ingen beskeder endnu" description="Når du skriver til en sælger eller giver et bud – eller nogen skriver til dig om dine varer – kommer samtalen her." className="py-12" />
      ) : (
        <ul className="divide-y divide-line rounded-lg border border-line">
          {rows.map((r) => (
            <li key={r.id}>
              <Link href={`/konto/beskeder/${r.id}/`} className={`flex items-center gap-4 p-4 hover:bg-sunken ${r.unread ? 'bg-[var(--rs-forest-50)]' : ''}`}>
                {r.image ? <img src={r.image} alt="" width={56} height={56} loading="lazy" className="h-14 w-14 shrink-0 rounded-md border border-line object-cover" /> : <span className="h-14 w-14 shrink-0 rounded-md bg-stone-100" />}
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className={`truncate ${r.unread ? 'font-bold' : 'font-semibold'}`}>{r.otherName}</span>
                    <Badge tone="neutral">{r.role === 'buyer' ? 'Du køber' : 'Du sælger'}</Badge>
                  </span>
                  <span className="block truncate text-small text-muted">{r.listingTitle}</span>
                  <span className={`block truncate text-small ${r.unread ? 'font-semibold text-ink' : 'text-slate-700'}`}>{r.preview}</span>
                </span>
                <span className="flex shrink-0 flex-col items-end gap-1 text-caption text-muted">
                  {when(r.lastMessageAt)}
                  {r.unread && <span className="h-2.5 w-2.5 rounded-full bg-coral-600" aria-label="Ulæst" />}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <AutoRefresh seconds={20} />
    </AuthPage>
  );
}
