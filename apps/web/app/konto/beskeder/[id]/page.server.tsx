import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Notice } from '@respin/ui';
import { formatKr } from '@respin/ui/utils';
import { AuthPage, linkCls } from '../../../../components/AuthPage';
import { AutoRefresh } from '../../../../components/support/AutoRefresh';
import { ChatThread } from '../../../../components/chat/ChatThread';
import { ChatComposer } from '../../../../components/chat/ChatComposer';
import { requireSession } from '../../../../lib/auth';
import { getDb } from '../../../../lib/server';
import { getImageStore } from '../../../../lib/image-store';
import { getThread } from '../../../../lib/conversations';
import { profilePath } from '../../../../lib/profile-url';
import { ListingHeader } from '../../../../components/chat/ListingHeader';

export const metadata = { title: 'Samtale', robots: { index: false } };

const OK: Record<string, string> = { accept: 'Du har accepteret buddet. Køberen får besked.', decline: 'Du har afvist buddet.', withdraw: 'Dit bud er trukket tilbage.' };

export default async function ConversationPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ ok?: string; fejl?: string; bud?: string }> }) {
  const { id } = await params;
  const current = await requireSession(`/konto/beskeder/${/^[0-9a-f-]{36}$/.test(id) ? `${id}/` : ''}`);
  const t = await getThread(getDb(), getImageStore(), current.user.id, id);
  if (!t) notFound();
  const sp = await searchParams;
  const forSale = t.listing.status === 'active' && t.listing.moderation === 'approved';
  return (
    <AuthPage width="page" title={t.other.name} crumbs={[{ label: 'Min konto', href: '/konto/' }, { label: 'Beskeder', href: '/konto/beskeder/' }, { label: t.other.name }]}>
      <ListingHeader listing={t.listing} forSale={forSale} note={t.role === 'buyer' ? 'du køber' : 'du sælger'}
        aside={t.other.username ? <Link href={profilePath(t.other.username)} className={`${linkCls} shrink-0 text-small`}>Se profil</Link> : null} />

      {sp.bud && <Notice icon="check" role="status">Dit bud er sendt. Sælgeren har 48 timer til at svare, og du får en mail, når der sker noget.</Notice>}
      {sp.ok && OK[sp.ok] && <Notice icon="check" role="status">{OK[sp.ok]}</Notice>}
      {sp.fejl && <Notice icon="info" warn role="alert">Buddet kunne ikke ændres – det er måske allerede besvaret eller udløbet.</Notice>}
      {t.acceptedOffer && (
        <Notice icon="check">
          <b>Aftalt pris: {formatKr(t.acceptedOffer.amountOre / 100)}</b> {t.role === 'buyer' ? 'Betaling på Videro åbner snart – så kan du købe til den pris med køberbeskyttelse.' : 'Køberen kan købe til den pris, når betaling på Videro åbner.'}
        </Notice>
      )}

      <section aria-label="Samtale" className="rounded-lg border border-line bg-sunken p-4 sm:p-5">
        <ChatThread conversationId={t.id} messages={t.messages} offers={t.offers} role={t.role} otherName={t.other.name} />
      </section>

      {t.other.status === 'active' ? <ChatComposer conversationId={t.id} /> : <Notice icon="info">Brugeren er ikke aktiv længere, så du kan ikke skrive i samtalen.</Notice>}
      <AutoRefresh seconds={8} />
    </AuthPage>
  );
}
