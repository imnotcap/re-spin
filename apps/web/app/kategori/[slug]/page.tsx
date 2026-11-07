import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Breadcrumbs } from '@respin/ui';
import { LiveSection } from '@respin-live';
import { T } from '../../../lib/i18n/client';
import { Browse } from '../../../components/browse/Browse';
import { CATEGORIES, getCategory, itemsIn, newest, toBrowse } from '../../../lib/catalog';

export const dynamicParams = false;
export const generateStaticParams = () => CATEGORIES.map((c) => ({ slug: c.slug }));

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const c = getCategory((await params).slug);
  return c ? { title: `${c.label} – brugt`, description: c.intro } : {};
}

export default async function CategoryPage({ params }: Props) {
  const c = getCategory((await params).slug);
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
      <Browse items={items} types={c.subs} showSeller />
    </div>
  );
}
