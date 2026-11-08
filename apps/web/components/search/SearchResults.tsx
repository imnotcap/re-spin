'use client';

import { useEffect, useMemo, useState } from 'react';
import { Browse } from '../browse/Browse';
import { searchItems, toBrowse } from '../../lib/catalog';
import { useI18n } from '../../lib/i18n/client';

const clean = (q: string | null | undefined) => (q ?? '').trim().slice(0, 100);

/**
 * Søgeresultater. `query` er adressens søgeparametre læst af serveren, så første HTML er de rigtige resultater.
 * Udeladt (statisk eksport): alle varer, indtil browseren har læst adressen.
 */
export function SearchResults({ query }: { query?: string }) {
  const { t } = useI18n();
  const [search, setSearch] = useState(query ?? '');
  useEffect(() => { if (query === undefined) setSearch(window.location.search); }, [query]);
  const q = clean(new URLSearchParams(search).get('q'));
  const items = useMemo(() => searchItems(q).map(toBrowse), [q]);
  return (
    <>
      <header className="mb-6 mt-4">
        <h1 className="text-h1 sm:text-[34px] sm:leading-[40px]">{q ? t('search.resultsFor', { q }) : t('search.all')}</h1>
        <p className="mt-1 text-body text-muted">{q ? t('search.descQ') : t('search.desc')}</p>
      </header>
      {/* key: ny søgning (fx fra headeren) starter med nulstillede filtre */}
      <Browse key={q} items={items} showCategories showSeller query={query === undefined ? undefined : search} />
    </>
  );
}
