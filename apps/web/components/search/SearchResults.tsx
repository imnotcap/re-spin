'use client';

import { Suspense, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { Browse } from '../browse/Browse';
import { searchItems, toBrowse } from '../../lib/catalog';
import { useI18n } from '../../lib/i18n/client';

function View({ q }: { q: string }) {
  const { t } = useI18n();
  const items = useMemo(() => searchItems(q).map(toBrowse), [q]);
  return (
    <>
      <header className="mb-6 mt-4">
        <h1 className="text-h1 sm:text-[34px] sm:leading-[40px]">{q ? t('search.resultsFor', { q }) : t('search.all')}</h1>
        <p className="mt-1 text-body text-muted">{q ? t('search.descQ') : t('search.desc')}</p>
      </header>
      <Browse items={items} showCategories showSeller />
    </>
  );
}

function WithParams() {
  const q = (useSearchParams().get('q') ?? '').trim().slice(0, 100);
  return <View q={q} />;
}

/** Søgeresultater. Uden JavaScript (og i den statiske HTML) vises alle varer. */
export function SearchResults() {
  return <Suspense fallback={<View q="" />}><WithParams /></Suspense>;
}
