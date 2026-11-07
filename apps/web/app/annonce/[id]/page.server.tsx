import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import { Breadcrumbs, Button, DetailList, Notice, PriceDetails, ProductGallery, SellerCard } from '@respin/ui';
import { SHIPPING_PRICE_ORE } from '@respin/core/fees';
import { formatKr } from '@respin/ui/utils';
import { ItemActions } from '../../../components/item/ItemActions';
import { getCurrentSession } from '../../../lib/auth';
import { getDb } from '../../../lib/server';
import { getImageStore } from '../../../lib/image-store';
import { getListing } from '../../../lib/listings';
import { CONDITION_HELP, getCategory, uploadedLabel } from '../../../lib/catalog';
import { PARCEL_LABEL } from '../../../lib/listing-labels';
import { T } from '../../../lib/i18n/client';

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ ny?: string; gemt?: string; gennemgang?: string }> };

const load = cache(async (id: string) => {
  const viewer = await getCurrentSession().catch(() => null);
  return getListing(getDb(), getImageStore(), id, viewer?.user.id);
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const l = await load((await params).id);
  if (!l) return { title: 'Annoncen findes ikke' };
  return { title: [l.title, l.brand].filter(Boolean).join(' – '), description: `${[l.brand, l.size && `str. ${l.size}`, l.condition.toLowerCase()].filter(Boolean).join(', ')}. ${formatKr(l.price)}` };
}

const daysAgo = (iso: string) => Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000));

export default async function ListingPage({ params, searchParams }: Props) {
  const l = await load((await params).id);
  if (!l) notFound();
  const sp = await searchParams;
  const cat = getCategory(l.category)!;
  const shippingKr = SHIPPING_PRICE_ORE[l.parcel] / 100;
  const meta = [l.brand, l.size && `str. ${l.size}`, l.condition].filter(Boolean).join(' · ');

  return (
    <div className="mx-auto max-w-7xl px-4 pt-5 sm:px-6">
      <Breadcrumbs items={[{ label: <T k="crumb.home" />, href: '/' }, { label: cat.label, href: `/kategori/${cat.slug}/` }, ...(l.sub ? [{ label: l.sub, href: `/kategori/${cat.slug}/?type=${encodeURIComponent(l.sub)}` }] : []), { label: l.title }]} />

      <div className="mt-4 flex flex-col gap-3" aria-live="polite">
        {sp.ny && l.isOwner && <Notice icon="check" role="status"><b>Din vare er til salg.</b> Den vises nu på forsiden og i {cat.label}.</Notice>}
        {sp.gemt && l.isOwner && <Notice icon="check" role="status">Ændringerne er gemt.</Notice>}
        {l.isOwner && l.moderation === 'pending' && (
          <Notice icon="info" warn role="status"><b>Annoncen venter på gennemgang</b>, før andre kan se den. Det sker typisk, når teksten nævner betaling uden om re:spin, telefonnumre eller links.</Notice>
        )}
        {l.status === 'sold' && <Notice icon="check" role="status">Denne vare er solgt.</Notice>}
      </div>

      <div className="mt-5 grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:gap-12">
        <div className="lg:sticky lg:top-24 lg:self-start">
          <ProductGallery images={l.images.map((i) => ({ src: i.src, srcSet: i.srcSet, alt: i.alt }))} placeholderIcon={cat.icon} sizes="(min-width: 1280px) 640px, (min-width: 1024px) 50vw, 100vw" />
        </div>

        <div>
          {l.brand && <Link href={`/soeg/?q=${encodeURIComponent(l.brand)}`} className="text-small font-bold text-forest underline-offset-4 hover:underline">{l.brand}</Link>}
          <h1 className="mt-1 text-h1 sm:text-[30px] sm:leading-[36px]">{l.title}</h1>
          <p className="mt-1 text-body text-muted">{[l.size && `Str. ${l.size}`, l.condition].filter(Boolean).join(' · ')}</p>

          <PriceDetails price={l.price} shippingFrom={shippingKr} className="mt-4" />

          <div className="mt-5">
            {l.isOwner ? (
              <div className="flex flex-wrap gap-2">
                <Button href={`/konto/annoncer/${l.id}/rediger/`} icon="edit">Redigér annonce</Button>
                <Button href="/konto/annoncer/" variant="outline">Mine annoncer</Button>
              </div>
            ) : l.status === 'active' ? (
              <ItemActions id={l.id} title={l.title} meta={meta} price={l.price} parcel={l.parcel} favorites={0} sellerName={l.seller.name} sellerCertified={l.seller.certified} />
            ) : null}
          </div>

          <Notice icon="shield" className="mt-5">
            <span><b>Køberbeskyttelse på alle køb.</b> Pengene holdes, til du har modtaget varen. Er den ikke som beskrevet, får du dem tilbage. <Link href="/sikkerhed/" className="font-semibold underline underline-offset-2">Læs mere</Link></span>
          </Notice>

          <section aria-labelledby="detaljer" className="mt-7">
            <h2 id="detaljer" className="text-h3">Detaljer</h2>
            <DetailList className="mt-2" items={[
              ...(l.brand ? [['Mærke', l.brand] as const] : []),
              ...(l.size ? [['Størrelse', l.size] as const] : []),
              ['Stand', <span key="s">{l.condition}<span className="block text-caption font-normal text-muted">{CONDITION_HELP[l.condition as keyof typeof CONDITION_HELP]}</span></span>],
              ['Kategori', <Link key="k" href={`/kategori/${cat.slug}/`} className="underline underline-offset-2">{cat.label}{l.sub ? ` · ${l.sub}` : ''}</Link>],
              ['Fragt', `${PARCEL_LABEL[l.parcel]}, ${formatKr(shippingKr)}`],
              ['Oprettet', uploadedLabel(daysAgo(l.createdAt))]
            ]} />
          </section>

          {l.description && (
            <section aria-labelledby="beskrivelse" className="mt-7">
              <h2 id="beskrivelse" className="text-h3">Beskrivelse</h2>
              <p className="mt-2 whitespace-pre-line break-words text-body text-slate-700">{l.description}</p>
            </section>
          )}

          <SellerCard className="mt-7" name={l.seller.name} certified={l.seller.certified} facts={[{ icon: 'user', text: 'Medlem af re:spin' }]} />
        </div>
      </div>
    </div>
  );
}
