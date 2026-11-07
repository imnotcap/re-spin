import type { Metadata } from 'next';
import { Breadcrumbs } from '@respin/ui';
import { SearchResults } from '../../components/search/SearchResults';

export const metadata: Metadata = { title: 'Søg', description: 'Søg i brugt tøj, sko, tasker og boligting.' };

export default function SearchPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 pt-5 sm:px-6">
      <Breadcrumbs items={[{ label: 'Forside', href: '/' }, { label: 'Søg' }]} />
      <SearchResults />
    </div>
  );
}
