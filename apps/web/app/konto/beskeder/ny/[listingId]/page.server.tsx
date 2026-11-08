import { notFound, redirect } from 'next/navigation';
import { Notice } from '@respin/ui';
import { AuthPage } from '../../../../../components/AuthPage';
import { ChatComposer } from '../../../../../components/chat/ChatComposer';
import { ListingHeader } from '../../../../../components/chat/ListingHeader';
import { requireSession } from '../../../../../lib/auth';
import { getDb } from '../../../../../lib/server';
import { getImageStore } from '../../../../../lib/image-store';
import { findConversation, listingToMessage } from '../../../../../lib/conversations';

export const metadata = { title: 'Skriv til sælger', robots: { index: false } };

/**
 * "Send besked" på en annonce. Har man allerede en samtale om varen, åbnes den. Ellers skriver man den første
 * besked her – samtalen oprettes først, når den er sendt (et klik alene giver ingen tom samtale hos sælgeren).
 */
export default async function NewConversationPage({ params }: { params: Promise<{ listingId: string }> }) {
  const { listingId } = await params;
  const current = await requireSession(`/konto/beskeder/ny/${/^[0-9a-f-]{36}$/.test(listingId) ? `${listingId}/` : ''}`);
  const db = getDb();
  const l = await listingToMessage(db, getImageStore(), listingId);
  if (!l) notFound();
  if (l.sellerId === current.user.id) redirect(`/annonce/${l.id}/`);
  const existing = await findConversation(db, current.user.id, l.id);
  if (existing) redirect(`/konto/beskeder/${existing}/`);
  return (
    <AuthPage width="page" title={`Skriv til ${l.sellerName}`} crumbs={[{ label: 'Min konto', href: '/konto/' }, { label: 'Beskeder', href: '/konto/beskeder/' }, { label: l.sellerName }]}>
      <ListingHeader listing={l} forSale={l.forSale} />
      {l.forSale ? (
        <>
          <p className="text-body text-slate-700">Spørg om mål, stand eller afhentning. Aftal aldrig betaling uden om Videro – kun køb her er dækket af køberbeskyttelsen.</p>
          <ChatComposer listingId={l.id} placeholder={`Hej ${l.sellerName}! …`} />
        </>
      ) : (
        <Notice icon="info" warn>Varen er ikke til salg længere, så du kan ikke skrive om den.</Notice>
      )}
    </AuthPage>
  );
}
