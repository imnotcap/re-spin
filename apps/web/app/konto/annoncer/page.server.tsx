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

export default async function MyListingsPage({ searchParams }: { searchParams: Promise<{ fjernet?: string; opdateret?: string }> }) {
  const current = await requireSession('/konto/annoncer/');
  const sp = await searchParams;
  const list = await myListings(getDb(), getImageStore(), current.user.id);
  return (
    <AuthPage width="page" title="Mine annoncer" crumbs={[{ label: 'Min konto', href: '/konto/' }, { label: 'Mine annoncer' }]}>
      {sp.fjernet && <Notice icon="check" role="status">Annoncen er fjernet.</Notice>}
      {sp.opdateret && <Notice icon="check" role="status">Annoncen er opdateret.</Notice>}
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
                    {l.moderation === 'rejected' && <Badge tone="coral">Afvist</Badge>}
                  </span>
                </span>
              </Link>
              {l.status !== 'reserved' && (
                <div className="flex flex-wrap gap-2">
                  <Button href={`/konto/annoncer/${l.id}/rediger/`} size="sm" variant="outline">Redigér</Button>
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
