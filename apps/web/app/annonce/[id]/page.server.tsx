import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import { Breadcrumbs, Button, DetailList, Notice, PriceDetails, ProductGallery, SellerCard } from '@respin/ui';
import { SHIPPING_PRICE_ORE } from '@respin/core/fees';
import { formatKr } from '@respin/ui/utils';
import { ItemActions } from '../../../components/item/ItemActions';
import { ReportListing } from '../../../components/item/ReportListing';
import { TrackListingView } from '../../../components/Tracker';
import { getCurrentSession } from '../../../lib/auth';
import { getDb } from '../../../lib/server';
import { getImageStore } from '../../../lib/image-store';
import { getListing } from '../../../lib/listings';
import { CONDITION_HELP, getCategory, uploadedLabel } from '../../../lib/catalog';
import { PARCEL_LABEL } from '../../../lib/listing-labels';
import { profilePath } from '../../../lib/profile-url';
import { T } from '../../../lib/i18n/client';
import { jsonLd, pageMetadata, priceMeta, productJsonLd } from '../../../lib/seo';
import { SITE_URL } from '../../../lib/site';

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ ny?: string; gemt?: string; gennemgang?: string; anmeld?: string; betaling?: string }> };

const PAYMENT_NOTICE: Record<string, string> = {
  annulleret: 'Betalingen blev afbrudt. Du har ikke købt varen, og der er ikke trukket penge.',
  listing_unavailable: 'Varen er lige blevet købt eller reserveret af en anden.',
  seller_unavailable: 'Sælgeren kan ikke sælge lige nu.',
  own_listing: 'Du kan ikke købe din egen vare.',
  payments_unavailable: 'Betaling er ikke slået til endnu. Prøv igen senere.',
  'for-mange': 'Du har prøvet at købe mange gange. Vent lidt, og prøv igen.'
};

const load = cache(async (id: string) => {
  const viewer = await getCurrentSession().catch(() => null);
  return getListing(getDb(), getImageStore(), id, viewer?.user.id);
});

/** Største udgave af et annoncebillede (1600 px) – bruges i link-forhåndsvisninger */
const fullSize = (i: { src: string; srcSet: string }) => i.srcSet.split(',').map((x) => x.trim().split(/\s+/)[0]!).at(-1) ?? i.src;
const facts = (l: { brand: string; size: string; condition: string }) => [l.size && `Str. ${l.size}`, l.condition, l.brand].filter(Boolean).join(' · ');

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const l = await load((await params).id);
  if (!l) return { title: 'Annoncen findes ikke', robots: { index: false } };
  const available = l.status === 'active';
  return pageMetadata({
    title: [l.title, l.brand].filter(Boolean).join(' – '),
    description: `${formatKr(l.price)}${available ? '' : ' (solgt)'} · ${facts(l)}. ${l.description || `Brugt ${l.title.toLowerCase()} til salg på Videro med køberbeskyttelse.`}`,
    path: `/annonce/${l.id}/`,
    images: l.images.slice(0, 1).map((i) => ({ url: fullSize(i), width: i.width, height: i.height, alt: i.alt })),
    noindex: !available || l.moderation !== 'approved',
    other: priceMeta(l.price, available)
  });
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
      {l.moderation === 'approved' && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(productJsonLd({
          name: l.title, description: l.description, url: `${SITE_URL}/annonce/${l.id}/`, images: l.images.map(fullSize),
          priceKr: l.price, available: l.status === 'active', brand: l.brand || null, seller: l.seller.name
        })) }} />
      )}
      <Breadcrumbs items={[{ label: <T k="crumb.home" />, href: '/' }, { label: cat.label, href: `/kategori/${cat.slug}/` }, ...(l.sub ? [{ label: l.sub, href: `/kategori/${cat.slug}/?type=${encodeURIComponent(l.sub)}` }] : []), { label: l.title }]} />

      <div className="mt-4 flex flex-col gap-3" aria-live="polite">
        {sp.ny && l.isOwner && <Notice icon="check" role="status"><b>Din vare er til salg.</b> Den vises nu på forsiden og i {cat.label}.</Notice>}
        {sp.gemt && l.isOwner && <Notice icon="check" role="status">Ændringerne er gemt.</Notice>}
        {l.isOwner && l.moderation === 'pending' && (
          <Notice icon="info" warn role="status"><b>Annoncen venter på gennemgang</b>, før andre kan se den. Det sker typisk, når teksten nævner betaling uden om Videro, telefonnumre eller links.</Notice>
        )}
        {l.status === 'sold' && <Notice icon="check" role="status">Denne vare er solgt.</Notice>}
        {l.status === 'reserved' && !l.isOwner && <Notice icon="info" role="status">Varen er reserveret, mens en køber betaler. Er betalingen ikke gennemført inden 30 minutter, kommer den til salg igen.</Notice>}
        {sp.betaling && PAYMENT_NOTICE[sp.betaling] && <Notice icon="info" warn role="alert">{PAYMENT_NOTICE[sp.betaling]}</Notice>}
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
                {l.status === 'active' && l.moderation === 'approved' && <Button href={`/konto/annoncer/${l.id}/fremhaev/`} variant="outline" icon="sparkle">Fremhæv annonce</Button>}
                <Button href="/konto/annoncer/" variant="ghost">Mine annoncer</Button>
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

          <SellerCard className="mt-7" name={l.seller.name} href={l.sellerUsername ? profilePath(l.sellerUsername) : undefined} certified={l.seller.certified} facts={[{ icon: 'user', text: 'Medlem af Videro' }]} />
          {!l.isOwner && <ReportListing listingId={l.id} status={sp.anmeld} />}
          <TrackListingView id={l.id} category={l.category} owner={l.isOwner} />
        </div>
      </div>
    </div>
  );
}
