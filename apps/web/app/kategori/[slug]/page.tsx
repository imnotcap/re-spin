import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Breadcrumbs } from '@respin/ui';
import { LiveSection } from '@respin-live';
import { T } from '../../../lib/i18n/client';
import { Browse } from '../../../components/browse/Browse';
import { CATEGORIES, getCategory, itemsIn, newest, toBrowse } from '../../../lib/catalog';
import { pageMetadata } from '../../../lib/seo';
import { BASE_PATH } from '../../../lib/site';
import { serverQuery, type SearchParams } from '../../../lib/query';

export const dynamicParams = false;
export const generateStaticParams = () => CATEGORIES.map((c) => ({ slug: c.slug }));

type Props = { params: Promise<{ slug: string }>; searchParams: SearchParams };

/** Titel i søgeresultater og delinger – skrevet, som folk søger */
const SHARE_TITLE: Record<string, string> = {
  kvinder: 'Brugt tøj, sko og tasker til kvinder', maend: 'Brugt tøj, sko og tasker til mænd', boern: 'Brugt børnetøj, babyudstyr og legetøj',
  hjem: 'Brugte boligting, tekstiler og lamper', underholdning: 'Brugte spil, bøger, vinyl og film', kaeledyr: 'Brugt udstyr til hund, kat og smådyr'
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const c = getCategory((await params).slug);
  return c ? pageMetadata({ title: SHARE_TITLE[c.slug] ?? `${c.label} – brugt`, description: `${c.intro} Køb brugt med køberbeskyttelse på Videro.`, path: `/kategori/${c.slug}/`, images: [{ url: `${BASE_PATH}/img/kategori/${c.slug}.webp`, width: 480, height: 480, alt: c.label }] }) : {};
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const c = getCategory((await params).slug);
  const query = await serverQuery(searchParams);
  if (!c) notFound();
  const ids = new Set(itemsIn(c.slug).map((i) => i.id));
  const items = newest().filter((i) => ids.has(i.id)).map(toBrowse);

  return (
    <div className="mx-auto max-w-7xl px-4 pt-5 sm:px-6">
      <Breadcrumbs items={[{ label: <T k="crumb.home" />, href: '/' }, { label: <T k={`cat.${c.slug}`} /> }]} />
      <header className="mt-4 mb-6">
        <h1 className="text-h1 sm:text-[34px] sm:leading-[40px]"><T k={`cat.${c.slug}`} /></h1>
        <p className="mt-1 max-w-2xl text-body text-muted"><T k={`intro.${c.slug}`} /></p>
      </header>
      <LiveSection id="medlemmer" title={<T k="cat.membersNew" vk={{ cat: `cat.${c.slug}` }} />} category={c.slug} className="mt-6" />
      <Browse key={query} items={items} category={c.slug} showSeller query={query} />
    </div>
  );
}
