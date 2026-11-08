'use client';

import { Browse } from '../browse/Browse';
import { useI18n } from '../../lib/i18n/client';
import type { BrowseItem } from '../../lib/browse';

/** Søgeresultater fra databasen (serveren søger). Filtre og sortering sker i browseren. */
export function SearchResults({ q, items, query }: { q: string; items: readonly BrowseItem[]; query: string }) {
  const { t } = useI18n();
  return (
    <>
      <header className="mb-6 mt-4">
        <h1 className="text-h1 sm:text-[34px] sm:leading-[40px]">{q ? t('search.resultsFor', { q }) : t('search.all')}</h1>
        <p className="mt-1 text-body text-muted">{q ? t('search.descQ') : t('search.desc')}</p>
      </header>
      <Browse items={items} showCategories showSeller query={query} searchQuery={q} />
    </>
  );
}
