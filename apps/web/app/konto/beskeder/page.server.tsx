import { EmptyState } from '@respin/ui';
import { AuthPage } from '../../../components/AuthPage';
import { AutoRefresh } from '../../../components/support/AutoRefresh';
import { requireSession } from '../../../lib/auth';
import { getDb } from '../../../lib/server';
import { getImageStore } from '../../../lib/image-store';
import { inbox } from '../../../lib/conversations';
import { ConversationList } from '../../../components/chat/ConversationList';

export const metadata = { title: 'Beskeder', robots: { index: false } };

export default async function InboxPage() {
  const current = await requireSession('/konto/beskeder/');
  const rows = await inbox(getDb(), getImageStore(), current.user.id);
  return (
    <AuthPage width="page" title="Beskeder" crumbs={[{ label: 'Min konto', href: '/konto/' }, { label: 'Beskeder' }]}>
      {rows.length === 0 ? (
        <EmptyState icon="chat" title="Ingen beskeder endnu" description="Når du skriver til en sælger eller giver et bud – eller nogen skriver til dig om dine varer – kommer samtalen her." className="py-12" />
      ) : (
        <div className="overflow-hidden rounded-lg border border-line bg-surface"><ConversationList rows={rows} /></div>
      )}
      <AutoRefresh seconds={20} />
    </AuthPage>
  );
}
