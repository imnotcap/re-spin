import Link from 'next/link';
import { Badge, Button, EmptyState, Icon } from '@respin/ui';
import { CATEGORY_LABEL, STATUS_LABEL, listCasesForUser } from '@respin/support';
import { AuthPage } from '../../../components/AuthPage';
import { requireSession } from '../../../lib/auth';
import { getDb } from '../../../lib/server';
import { STATUS_TONE } from '../../../lib/support-labels';

export const metadata = { title: 'Kundeservice' };

const when = (d: Date) => d.toLocaleString('da-DK', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Copenhagen' });

export default async function SupportPage() {
  const current = await requireSession('/konto/support/');
  const cases = await listCasesForUser(getDb(), current.user.id);
  return (
    <AuthPage width="page" title="Kundeservice" intro="Skriv til os om ordrer, betaling, din konto eller noget helt andet. Du kan se vores svar her og på Min konto."
      crumbs={[{ label: 'Min konto', href: '/konto/' }, { label: 'Kundeservice' }]}>
      <div><Button href="/konto/support/ny/" icon="plus">Ny henvendelse</Button></div>
      {cases.length === 0 ? (
        <EmptyState icon="chat" title="Ingen henvendelser endnu" description="Når du skriver til os, kan du følge samtalen her." />
      ) : (
        <ul className="divide-y divide-line rounded-lg border border-line">
          {cases.map((c) => (
            <li key={c.id}>
              <Link href={`/konto/support/${c.number}/`} className="flex items-center gap-4 p-4 hover:bg-sunken">
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    {c.unread && <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-coral-600" aria-hidden="true" />}
                    <span className="truncate font-semibold">{c.subject}</span>
                  </span>
                  <span className="mt-0.5 block text-small text-muted">#{c.number} · {CATEGORY_LABEL[c.category]} · opdateret {when(c.updatedAt)}</span>
                </span>
                {c.unread ? <Badge tone="coral">Nyt svar</Badge> : <Badge tone={STATUS_TONE[c.status]}>{STATUS_LABEL[c.status]}</Badge>}
                <Icon name="next" size={20} className="text-muted" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </AuthPage>
  );
}
