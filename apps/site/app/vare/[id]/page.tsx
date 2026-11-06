import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Breadcrumbs, DetailList, Notice, PriceDetails, ProductGallery, ProductGrid, SectionHeader, SellerCard } from '@respin/ui';
import { SHIPPING_PRICE_ORE } from '@respin/core/fees';
import { formatKr } from '@respin/ui/utils';
import { ItemCard } from '../../../components/ItemCard';
import { ItemActions } from '../../../components/item/ItemActions';
import { CONDITION_HELP, ITEMS, categoryOf, getItem, itemsBySeller, sellerOf, similarTo, toCard, uploadedLabel } from '../../../lib/catalog';

export const dynamicParams = false;
export const generateStaticParams = () => ITEMS.map((i) => ({ id: i.id }));

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const item = getItem((await params).id);
  if (!item) return {};
  return { title: `${item.title} – ${item.brand}`, description: `${item.brand}, str. ${item.size}, ${item.condition.toLowerCase()}. ${formatKr(item.price)} ${item.description}` };
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
  const images = Array.from({ length: item.photos }, (_, i) => ({ alt: `${item.title}, billede ${i + 1}`, shade: i }));
  const meta = `${item.brand} · str. ${item.size} · ${item.condition}`;

  return (
    <div className="mx-auto max-w-7xl px-4 pt-5 sm:px-6">
      <Breadcrumbs items={[{ label: 'Forside', href: '/' }, { label: cat.label, href: `/kategori/${cat.slug}/` }, { label: item.sub, href: `/kategori/${cat.slug}/?type=${encodeURIComponent(item.sub)}` }, { label: item.title }]} />

      <div className="mt-5 grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:gap-12">
        <div className="lg:sticky lg:top-24 lg:self-start">
          <ProductGallery images={images} placeholderIcon={item.icon} />
        </div>

        <div>
          <Link href={`/soeg/?q=${encodeURIComponent(item.brand)}`} className="text-small font-bold text-forest underline-offset-4 hover:underline">{item.brand}</Link>
          <h1 className="mt-1 text-h1 sm:text-[30px] sm:leading-[36px]">{item.title}</h1>
          <p className="mt-1 text-body text-muted">Str. {item.size} · {item.condition}</p>

          <PriceDetails price={item.price} shippingFrom={shippingKr} className="mt-4" />

          <div className="mt-5">
            <ItemActions id={item.id} title={item.title} meta={meta} price={item.price} parcel={item.parcel} favorites={item.favorites}
              sellerName={seller.name} sellerCertified={seller.certified} />
          </div>

          <Notice icon="shield" className="mt-5">
            <span><b>Køberbeskyttelse på alle køb.</b> Pengene holdes, til du har modtaget varen. Er den ikke som beskrevet, får du dem tilbage. <Link href="/sikkerhed/" className="font-semibold underline underline-offset-2">Læs mere</Link></span>
          </Notice>

          <section aria-labelledby="detaljer" className="mt-7">
            <h2 id="detaljer" className="text-h3">Detaljer</h2>
            <DetailList className="mt-2" items={[
              ['Mærke', item.brand],
              ['Størrelse', item.size],
              ['Stand', <span key="s">{item.condition}<span className="block text-caption font-normal text-muted">{CONDITION_HELP[item.condition]}</span></span>],
              ['Farve', item.color],
              ...(item.material ? [['Materiale', item.material] as const] : []),
              ['Kategori', <Link key="k" href={`/kategori/${cat.slug}/`} className="underline underline-offset-2">{cat.label} · {item.sub}</Link>],
              ['Fragt', `${PARCEL[item.parcel]}, ${formatKr(shippingKr)}`],
              ['Sendes fra', seller.city],
              ['Oprettet', uploadedLabel(item.uploaded)]
            ]} />
          </section>

          <section aria-labelledby="beskrivelse" className="mt-7">
            <h2 id="beskrivelse" className="text-h3">Beskrivelse</h2>
            <p className="mt-2 whitespace-pre-line text-body text-slate-700">{item.description}</p>
          </section>

          <SellerCard className="mt-7" name={seller.name} href={`/medlem/${seller.id}/`} rating={seller.rating} reviews={seller.reviews} certified={seller.certified}
            facts={[
              { icon: 'pin', text: seller.city },
              { icon: 'clock', text: `Svarer typisk ${seller.responds}` },
              { icon: 'package', text: `${seller.sold} solgte varer` }
            ]} />
        </div>
      </div>

      {more.length > 0 && (
        <section aria-labelledby="flere" className="mt-16">
          <SectionHeader id="flere" title={`Flere fra ${seller.name}`} action={{ label: 'Se profil', href: `/medlem/${seller.id}/` }} className="px-0" />
          <ProductGrid layout="responsive">{more.map((i) => <ItemCard key={i.id} item={toCard(i)} />)}</ProductGrid>
        </section>
      )}

      <section aria-labelledby="lignende" className="mt-16">
        <SectionHeader id="lignende" title="Lignende varer" action={{ label: `Alt i ${cat.label}`, href: `/kategori/${cat.slug}/` }} className="px-0" />
        <ProductGrid layout="responsive">{similar.map((i) => <ItemCard key={i.id} item={toCard(i)} />)}</ProductGrid>
      </section>
    </div>
  );
}
