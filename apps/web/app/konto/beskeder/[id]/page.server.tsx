import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Avatar, Icon } from '@respin/ui';
import { formatKr } from '@respin/ui/utils';
import { AutoRefresh } from '../../../../components/support/AutoRefresh';
import { ChatThread } from '../../../../components/chat/ChatThread';
import { ChatComposer } from '../../../../components/chat/ChatComposer';
import { ConversationList } from '../../../../components/chat/ConversationList';
import { requireSession } from '../../../../lib/auth';
import { getDb } from '../../../../lib/server';
import { getImageStore } from '../../../../lib/image-store';
import { getThread, inbox } from '../../../../lib/conversations';
import { profilePath } from '../../../../lib/profile-url';

export const metadata = { title: 'Samtale', robots: { index: false } };

const OK: Record<string, string> = { accept: 'Du har accepteret buddet. Køberen får besked.', decline: 'Du har afvist buddet.', withdraw: 'Dit bud er trukket tilbage.' };

/** Smal besked under toppen (status for bud o.l.) */
function Banner({ tone = 'ok', children }: { tone?: 'ok' | 'warn'; children: React.ReactNode }) {
  return (
    <p role="status" className={`flex items-start gap-2 border-b px-4 py-2.5 text-small sm:px-6 ${tone === 'ok' ? 'border-line bg-[var(--rs-forest-50)] text-ink' : 'border-amber-200 bg-amber-50 text-amber-900'}`}>
      <Icon name={tone === 'ok' ? 'check' : 'info'} size={16} className="mt-0.5 shrink-0" /><span>{children}</span>
    </p>
  );
}

/**
 * Én samtale, der fylder hele skærmen under headeren (topbjælke, kategorimenu, footer og bundmenu skjules – se
 * [data-fullscreen] i globals.css). På store skærme står samtalelisten til venstre. Beskederne scroller i midten
 * (flex-col-reverse: siden åbner nederst ved de nyeste), og skrivefeltet står altid nederst.
 */
export default async function ConversationPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ ok?: string; fejl?: string; bud?: string }> }) {
  const { id } = await params;
  const current = await requireSession(`/konto/beskeder/${/^[0-9a-f-]{36}$/.test(id) ? `${id}/` : ''}`);
  // Samtalen først (den markeres som læst), så listen til venstre ikke viser den som ulæst
  const t = await getThread(getDb(), getImageStore(), current.user.id, id);
  if (!t) notFound();
  const rows = await inbox(getDb(), getImageStore(), current.user.id).catch(() => []);
  const sp = await searchParams;
  const forSale = t.listing.status === 'active' && t.listing.moderation === 'approved';
  const status = forSale ? 'Til salg' : t.listing.status === 'sold' ? 'Solgt' : t.listing.status === 'reserved' ? 'Reserveret' : 'Ikke til salg';

  return (
    <div data-fullscreen className="mx-auto grid h-[calc(100dvh-4rem)] max-w-7xl lg:grid-cols-[340px_minmax(0,1fr)] lg:border-x lg:border-line">
      <aside aria-label="Dine samtaler" className="hidden min-h-0 flex-col border-r border-line bg-surface lg:flex">
        <h2 className="border-b border-line px-4 py-4 text-[18px] font-bold leading-6"><Link href="/konto/beskeder/" className="hover:underline">Beskeder</Link></h2>
        <div className="min-h-0 flex-1 overflow-y-auto"><ConversationList rows={rows} activeId={t.id} /></div>
      </aside>

      <section aria-label={`Samtale med ${t.other.name}`} className="flex min-h-0 flex-col bg-canvas">
        {/* Toppen: hvem og hvilken vare */}
        <header className="border-b border-line bg-surface">
          <div className="flex items-center gap-3 px-3 py-3 sm:px-6">
            <Link href="/konto/beskeder/" className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md hover:bg-sunken lg:hidden" aria-label="Tilbage til beskeder">
              <Icon name="back" size={22} />
            </Link>
            <Avatar name={t.other.name} src={t.other.avatar ?? undefined} />
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-[17px] font-bold leading-6">{t.other.name}</h1>
              <p className="truncate text-caption text-muted">{t.role === 'buyer' ? 'Sælger af varen' : 'Vil købe din vare'}</p>
            </div>
            {t.other.username && <Link href={profilePath(t.other.username)} className="shrink-0 text-small font-semibold text-forest underline underline-offset-4">Se profil</Link>}
          </div>
          <Link href={`/annonce/${t.listing.id}/`} className="flex items-center gap-3 border-t border-line bg-sunken/60 px-4 py-2.5 hover:bg-sunken sm:px-6">
            {t.listing.image ? <img src={t.listing.image} alt="" width={40} height={40} className="h-10 w-10 shrink-0 rounded-md object-cover" /> : <span className="h-10 w-10 shrink-0 rounded-md bg-stone-100" />}
            <span className="min-w-0 flex-1">
              <span className="block truncate text-small font-semibold">{t.listing.title}</span>
              <span className="block text-caption text-muted">{formatKr(t.listing.priceOre / 100)} · {t.role === 'buyer' ? 'du køber' : 'du sælger'}</span>
            </span>
            <span className={`shrink-0 rounded-pill px-2.5 py-0.5 text-caption font-bold ${forSale ? 'bg-[var(--rs-forest-50)] text-forest' : 'bg-stone-100 text-slate-700'}`}>{status}</span>
          </Link>
        </header>

        {sp.bud && <Banner>Dit bud er sendt. Sælgeren har 48 timer til at svare, og du får en mail, når der sker noget.</Banner>}
        {sp.ok && OK[sp.ok] && <Banner>{OK[sp.ok]}</Banner>}
        {sp.fejl && <Banner tone="warn">Buddet kunne ikke ændres – det er måske allerede besvaret eller udløbet.</Banner>}
        {t.acceptedOffer && (
          <Banner><b>Aftalt pris: {formatKr(t.acceptedOffer.amountOre / 100)}.</b> {t.role === 'buyer' ? 'Betaling på Videro åbner snart – så kan du købe til den pris med køberbeskyttelse.' : 'Køberen kan købe til den pris, når betaling på Videro åbner.'}</Banner>
        )}

        {/* Beskederne: column-reverse holder visningen nederst ved de nyeste, også når nye kommer til */}
        <div className="flex min-h-0 flex-1 flex-col-reverse overflow-y-auto overscroll-contain px-3 py-4 sm:px-6">
          <div>
            <p className="mx-auto mb-2 flex max-w-md items-start justify-center gap-1.5 text-center text-caption text-muted">
              <Icon name="shield" size={14} className="mt-0.5 shrink-0 text-forest" />
              <span>Betal altid på Videro – så er du dækket af køberbeskyttelsen. Del aldrig betaling eller telefonnummer.</span>
            </p>
            <ChatThread conversationId={t.id} messages={t.messages} offers={t.offers} role={t.role} other={t.other} otherReadAt={t.otherReadAt} />
          </div>
        </div>

        <div className="border-t border-line bg-surface px-3 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-3 sm:px-6">
          {t.other.status === 'active'
            ? <ChatComposer conversationId={t.id} />
            : <p className="py-2 text-center text-small text-muted">{t.other.name} er ikke aktiv længere, så du kan ikke skrive i samtalen.</p>}
        </div>
      </section>
      <AutoRefresh seconds={8} />
    </div>
  );
}
