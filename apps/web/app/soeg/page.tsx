import type { Metadata } from 'next';
import { pageMetadata } from '../../lib/seo';
import { Suspense } from 'react';
import { Breadcrumbs } from '@respin/ui';
import { LiveSearch } from '@respin-live';
import { T } from '../../lib/i18n/client';
import { SearchResults } from '../../components/search/SearchResults';

export const metadata: Metadata = pageMetadata({ title: 'Søg i brugt tøj og ting', description: 'Søg i brugt tøj, sko, tasker og boligting fra folk i hele Danmark – med køberbeskyttelse på alle køb.', path: '/soeg/' });

export default function SearchPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 pt-5 sm:px-6">
      <Breadcrumbs items={[{ label: <T k="crumb.home" />, href: '/' }, { label: <T k="crumb.search" /> }]} />
      <SearchResults />
      <Suspense><LiveSearch /></Suspense>
    </div>
  );
}
