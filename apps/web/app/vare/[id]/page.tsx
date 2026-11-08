import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Breadcrumbs, DetailList, Notice, PriceDetails, ProductGallery, ProductGrid, SectionHeader, SellerCard } from '@respin/ui';
import { SHIPPING_PRICE_ORE } from '@respin/core/fees';
import { formatKr } from '@respin/ui/utils';
import { ItemCard } from '../../../components/ItemCard';
import { itemImage } from '../../../lib/images';
import { ItemActions } from '../../../components/item/ItemActions';
import { T } from '../../../lib/i18n/client';
import { profilePath } from '../../../lib/profile-url';
import { jsonLd, pageMetadata, priceMeta, productJsonLd } from '../../../lib/seo';
import { BASE_PATH, SITE_URL } from '../../../lib/site';
import { CONDITION_HELP, ITEMS, categoryOf, getItem, itemsBySeller, sellerOf, similarTo, toCard } from '../../../lib/catalog';

export const dynamicParams = false;
export const generateStaticParams = () => ITEMS.map((i) => ({ id: i.id }));

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const item = getItem((await params).id);
  if (!item) return {};
  return pageMetadata({
    title: `${item.title} – ${item.brand}`,
    description: `${formatKr(item.price)} · Str. ${item.size} · ${item.condition} · ${item.brand}. ${item.description}`,
    path: `/vare/${item.id}/`,
    images: [{ url: `${BASE_PATH}/img/vare/${item.id}-960.webp`, width: 960, height: 1200, alt: `${item.title} fra ${item.brand}` }],
    other: priceMeta(item.price, true)
  });
}

const PARCEL = { small: 'Lille pakke (op til 2 kg)', medium: 'Mellem pakke (op til 5 kg)' } as const;

export default async function ItemPage({ params }: Props) {
  const item = getItem((await params).id);
  if (!item) notFound();
  const seller = sellerOf(item);
  const cat = categoryOf(item);
  const shippingKr = SHIPPING_PRICE_ORE[item.parcel] / 100;
  const more = itemsBySeller(seller.id).filter((i) => i.id !== item.id).slice(0, 6);
  const similar = similarTo(item, 6);
  const photo = itemImage(item.id);
  const images = [{ src: photo.src, srcSet: photo.srcSet, alt: `${item.title} fra ${item.brand}` }];
  const meta = `${item.brand} · str. ${item.size} · ${item.condition}`;

  return (
    <div className="mx-auto max-w-7xl px-4 pt-5 sm:px-6">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(productJsonLd({
        name: `${item.title} – ${item.brand}`, description: item.description, url: `${SITE_URL}/vare/${item.id}/`,
        images: [`${SITE_URL}/img/vare/${item.id}-960.webp`], priceKr: item.price, available: true, brand: item.brand, seller: seller.name
      })) }} />
      <Breadcrumbs items={[{ label: <T k="crumb.home" />, href: '/' }, { label: <T k={`cat.${cat.slug}`} />, href: `/kategori/${cat.slug}/` }, { label: <T k={`sub.${item.sub}`} fallback={item.sub} />, href: `/kategori/${cat.slug}/?type=${encodeURIComponent(item.sub)}` }, { label: item.title }]} />

      <div className="mt-5 grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:gap-12">
        <div className="lg:sticky lg:top-24 lg:self-start">
          <ProductGallery images={images} placeholderIcon={item.icon} sizes="(min-width: 1280px) 640px, (min-width: 1024px) 50vw, 100vw" />
        </div>

        <div>
          <Link href={`/soeg/?q=${encodeURIComponent(item.brand)}`} className="text-small font-bold text-forest underline-offset-4 hover:underline">{item.brand}</Link>
          <h1 className="mt-1 text-h1 sm:text-[30px] sm:leading-[36px]">{item.title}</h1>
          <p className="mt-1 text-body text-muted"><T k="item.sizeShort" v={{ size: item.size }} /> · <T k={`cond.${item.condition}`} /></p>

          <PriceDetails price={item.price} shippingFrom={shippingKr} className="mt-4" />

          <div className="mt-5">
            <ItemActions id={item.id} title={item.title} meta={meta} price={item.price} parcel={item.parcel} favorites={item.favorites}
              sellerName={seller.name} sellerCertified={seller.certified} />
          </div>

          <Notice icon="shield" className="mt-5">
            <span><b><T k="item.protection" /></b> <T k="item.protectionText" /> <Link href="/sikkerhed/" className="font-semibold underline underline-offset-2"><T k="item.readMore" /></Link></span>
          </Notice>

          <section aria-labelledby="detaljer" className="mt-7">
            <h2 id="detaljer" className="text-h3"><T k="item.details" /></h2>
            <DetailList className="mt-2" items={[
              [<T key="b" k="item.brand" />, item.brand],
              [<T key="s" k="item.size" />, item.size],
              [<T key="c" k="item.condition" />, <span key="s"><T k={`cond.${item.condition}`} /><span className="block text-caption font-normal text-muted">{CONDITION_HELP[item.condition]}</span></span>],
              [<T key="f" k="item.color" />, item.color],
              ...(item.material ? [[<T key="m" k="item.material" />, item.material] as const] : []),
              [<T key="k" k="item.category" />, <Link key="k" href={`/kategori/${cat.slug}/`} className="underline underline-offset-2"><T k={`cat.${cat.slug}`} /> · <T k={`sub.${item.sub}`} fallback={item.sub} /></Link>],
              [<T key="p" k="item.shipping" />, <span key="p"><T k={`parcel.${item.parcel}`} />, {formatKr(shippingKr)}</span>],
              [<T key="from" k="item.shipsFrom" />, seller.city],
              [<T key="o" k="item.created" />, item.uploaded <= 0 ? <T key="o" k="time.today" /> : item.uploaded === 1 ? <T key="o" k="time.yesterday" /> : <T key="o" k="time.daysAgo" v={{ n: item.uploaded }} />]
            ]} />
          </section>

          <section aria-labelledby="beskrivelse" className="mt-7">
            <h2 id="beskrivelse" className="text-h3"><T k="item.description" /></h2>
            <p className="mt-2 whitespace-pre-line text-body text-slate-700">{item.description}</p>
          </section>

          <SellerCard className="mt-7" name={seller.name} href={profilePath(seller.name)} rating={seller.rating} reviews={seller.reviews} certified={seller.certified}
            facts={[
              { icon: 'pin', text: seller.city },
              { icon: 'clock', text: `Svarer typisk ${seller.responds}` },
              { icon: 'package', text: `${seller.sold} solgte varer` }
            ]} />
        </div>
      </div>

      {more.length > 0 && (
        <section aria-labelledby="flere" className="mt-16">
          <SectionHeader id="flere" title={<T k="item.moreFrom" v={{ name: seller.name }} />} action={{ label: <T k="item.seeProfile" />, href: profilePath(seller.name) }} className="px-0" />
          <ProductGrid layout="responsive">{more.map((i) => <ItemCard key={i.id} item={toCard(i)} />)}</ProductGrid>
        </section>
      )}

      <section aria-labelledby="lignende" className="mt-16">
        <SectionHeader id="lignende" title={<T k="item.similar" />} action={{ label: <T k="item.allIn" vk={{ cat: `cat.${cat.slug}` }} />, href: `/kategori/${cat.slug}/` }} className="px-0" />
        <ProductGrid layout="responsive">{similar.map((i) => <ItemCard key={i.id} item={toCard(i)} />)}</ProductGrid>
      </section>
    </div>
  );
}
