import Link from 'next/link';
import { Badge, Button, EmptyState, Notice } from '@respin/ui';
import { formatKr } from '@respin/ui/utils';
import { AuthPage } from '../../../components/AuthPage';
import { requireSession } from '../../../lib/auth';
import { getDb } from '../../../lib/server';
import { getImageStore } from '../../../lib/image-store';
import { myListings } from '../../../lib/listings';
import { LISTING_STATUS_LABEL } from '../../../lib/listing-labels';
import { listingStatusAction } from '../../../lib/listing-actions';
import { activePromotions } from '../../../lib/promotions';

const dateFmt = new Intl.DateTimeFormat('da-DK', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Copenhagen' });

export const metadata = { title: 'Mine annoncer' };

function StatusButton({ id, action, label, variant = 'outline' }: { id: string; action: 'sold' | 'active' | 'removed'; label: string; variant?: 'outline' | 'ghost' }) {
  return (
    <form action={listingStatusAction}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="action" value={action} />
      <Button type="submit" size="sm" variant={variant}>{label}</Button>
    </form>
  );
}

export default async function MyListingsPage({ searchParams }: { searchParams: Promise<{ fjernet?: string; opdateret?: string; fremhaevet?: string }> }) {
  const current = await requireSession('/konto/annoncer/');
  const sp = await searchParams;
  const db = getDb();
  const list = await myListings(db, getImageStore(), current.user.id);
  const promos = await activePromotions(db, list.map((l) => l.id));
  return (
    <AuthPage width="page" title="Mine annoncer" crumbs={[{ label: 'Min konto', href: '/konto/' }, { label: 'Mine annoncer' }]}>
      {sp.fjernet && <Notice icon="check" role="status">Annoncen er fjernet.</Notice>}
      {sp.opdateret && <Notice icon="check" role="status">Annoncen er opdateret.</Notice>}
      {sp.fremhaevet && <Notice icon="check" role="status">Tak for dit køb! Fremhævningen starter, så snart betalingen er bekræftet – normalt inden for et minut.</Notice>}
      <div><Button href="/saelg/ny/" icon="plus">Sæt en vare til salg</Button></div>

      {list.length === 0 ? (
        <EmptyState icon="tag" title="Du har ingen annoncer endnu" description="Tag et par billeder, skriv en pris, og din vare er til salg på et par minutter." />
      ) : (
        <ul className="divide-y divide-line rounded-lg border border-line">
          {list.map((l) => (
            <li key={l.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
              <Link href={`/annonce/${l.id}/`} className="flex min-w-0 flex-1 items-center gap-4">
                {l.image
                  ? <img src={l.image.src} alt="" width={64} height={64} loading="lazy" className="h-16 w-16 shrink-0 rounded-md border border-line object-cover" />
                  : <span className="h-16 w-16 shrink-0 rounded-md bg-stone-100" />}
                <span className="min-w-0">
                  <span className="block truncate font-semibold">{l.title}</span>
                  <span className="block text-small text-muted">{formatKr(l.price)}{l.brand ? ` · ${l.brand}` : ''}</span>
                  <span className="mt-1 flex flex-wrap gap-1.5">
                    <Badge tone={l.status === 'active' ? 'forest' : 'neutral'}>{LISTING_STATUS_LABEL[l.status]}</Badge>
                    {l.moderation === 'pending' && <Badge tone="warn">Venter på gennemgang</Badge>}
                    {l.moderation === 'rejected' && <Badge tone="coral">{l.status === 'removed' ? 'Fjernet af Videro' : 'Afvist'}</Badge>}
                    {promos.has(l.id) && <Badge tone="lime">Fremhævet til {dateFmt.format(promos.get(l.id)!)}</Badge>}
                  </span>
                  {l.moderationNote && <span className="mt-1.5 block text-small text-red-700"><b>Begrundelse fra Videro:</b> {l.moderationNote}</span>}
                </span>
              </Link>
              {l.status !== 'reserved' && l.status !== 'removed' && (
                <div className="flex flex-wrap gap-2">
                  <Button href={`/konto/annoncer/${l.id}/rediger/`} size="sm" variant="outline">Redigér</Button>
                  {l.status === 'active' && l.moderation === 'approved' && <Button href={`/konto/annoncer/${l.id}/fremhaev/`} size="sm" variant="outline" icon="sparkle">{promos.has(l.id) ? 'Forlæng fremhævning' : 'Fremhæv'}</Button>}
                  {l.status === 'active' && <StatusButton id={l.id} action="sold" label="Markér som solgt" />}
                  {l.status === 'sold' && <StatusButton id={l.id} action="active" label="Sæt til salg igen" />}
                  <StatusButton id={l.id} action="removed" label="Fjern" variant="ghost" />
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </AuthPage>
  );
}
