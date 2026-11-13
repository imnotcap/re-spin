import type { Metadata } from 'next';
import { pageMetadata } from '../../lib/seo';
import { Breadcrumbs } from '@respin/ui';
import { T } from '../../lib/i18n/client';
import { SearchResults } from '../../components/search/SearchResults';
import { serverQuery, type SearchParams } from '../../lib/query';
import { getDb } from '../../lib/server';
import { getImageStore } from '../../lib/image-store';
import { listForBrowse } from '../../lib/listings';
import { listingToBrowse } from '../../lib/listing-card';
import { searchMembers } from '../../lib/profile';
import { PeopleResults } from '../../components/search/PeopleResults';

export const metadata: Metadata = pageMetadata({ title: 'Søg i brugt tøj og ting', description: 'Søg i brugt tøj, sko, tasker og boligting fra folk i hele Danmark – med køberbeskyttelse på alle køb.', path: '/soeg/' });

export default async function SearchPage({ searchParams }: { searchParams: SearchParams }) {
  const query = (await serverQuery(searchParams)) ?? '';
  const q = (new URLSearchParams(query).get('q') ?? '').trim().slice(0, 100);
  // Annoncer og personer hentes samtidig; "@navn" søger kun efter personer
  const personOnly = q.startsWith('@');
  const [listings, people] = await Promise.all([
    personOnly ? Promise.resolve([]) : listForBrowse(getDb(), getImageStore(), { q: q || undefined }).catch((e) => {
      console.error('soeg-fejl', e instanceof Error ? e.message : 'ukendt');
      return [];
    }),
    q ? searchMembers(getDb(), getImageStore(), q).catch(() => []) : Promise.resolve([])
  ]);
  const items = listings.map((l) => listingToBrowse(l));
  return (
    <div className="mx-auto max-w-7xl px-4 pt-5 sm:px-6">
      <Breadcrumbs items={[{ label: <T k="crumb.home" />, href: '/' }, { label: <T k="crumb.search" /> }]} />
      <PeopleResults people={people} q={q} />
      {/* key: ny søgning (fx fra headeren) starter med nulstillede filtre */}
      <SearchResults key={q} q={q} items={items} query={query} />
    </div>
  );
}
