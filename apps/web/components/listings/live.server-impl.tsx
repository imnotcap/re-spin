import 'server-only';
import { ProductGrid, SectionHeader } from '@respin/ui';
import { ItemCard } from '../ItemCard';
import { getDb } from '../../lib/server';
import { getImageStore } from '../../lib/image-store';
import { listFeed } from '../../lib/listings';
import { listingToCard } from '../../lib/listing-card';
import type { LiveSectionProps } from './live';
export { LiveSearch } from './LiveSearch';

/** Server-renderet (ingen layout-skift): vises kun, når der findes annoncer. En databasefejl skjuler blot sektionen. */
export async function LiveSection({ title, category, limit = 12, id, className }: LiveSectionProps) {
  const items = await listFeed(getDb(), getImageStore(), { category: category as never, limit }).catch((e) => {
    console.error('feed-fejl', e instanceof Error ? e.message : 'ukendt');
    return [];
  });
  if (!items.length) return null;
  return (
    <section aria-labelledby={id} className={className}>
      <SectionHeader id={id} title={title} action={{ label: 'Sælg selv', href: '/saelg/ny/' }} className="px-0" />
      <ProductGrid layout="responsive">{items.map((l) => <ItemCard key={l.id} item={listingToCard(l)} showSeller />)}</ProductGrid>
    </section>
  );
}
