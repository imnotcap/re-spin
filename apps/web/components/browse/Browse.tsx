'use client';

import { Suspense, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button, Chip, Dropdown, EmptyState, ProductGrid } from '@respin/ui';
import { ItemCard } from '../ItemCard';
import { useI18n } from '../../lib/i18n/client';
import {
  DEFAULT_FILTERS, PRICE_BUCKETS, SORTS, activeFilterCount, compareSizes, applyFilters, filtersToSearch, optionsFor, parseFilters,
  type BrowseItem, type BrowseOptions, type Filters
} from '../../lib/browse';

export interface BrowseProps {
  items: readonly BrowseItem[];
  /** Underkategorier som chips (kategorisiden) */
  types?: readonly string[];
  /** Vis kategorier som chips (søgning og favoritter) */
  showCategories?: boolean;
  /** Vis sælger over kortene */
  showSeller?: boolean;
}

function BrowseView({ items, opt, filters, onChange, showSeller }: { items: readonly BrowseItem[]; opt: BrowseOptions; filters: Filters; onChange: (f: Filters) => void; showSeller?: boolean }) {
  const { t, n: num } = useI18n();
  const result = useMemo(() => applyFilters(items, filters), [items, filters]);
  const active = activeFilterCount(filters);
  const set = (patch: Partial<Filters>) => onChange({ ...filters, ...patch });
  const n = result.length;

  return (
    <div>
      {(opt.types.length > 1 || (filters.type && !opt.types.includes(filters.type))) && (
        <div role="group" aria-label={t('browse.type')} className="flex flex-wrap gap-2">
          <Chip pressed={!filters.type} onClick={() => set({ type: undefined })}>{t('browse.all')}</Chip>
          {(filters.type && !opt.types.includes(filters.type) ? [...opt.types, filters.type] : opt.types).map((x) => <Chip key={x} pressed={filters.type === x} onClick={() => set({ type: filters.type === x ? undefined : x })}>{t(`sub.${x}`, undefined, x)}</Chip>)}
        </div>
      )}
      {opt.categories.length > 1 && (
        <div role="group" aria-label={t('browse.category')} className="flex flex-wrap gap-2">
          <Chip pressed={!filters.kategori} onClick={() => set({ kategori: undefined })}>{t('browse.all')}</Chip>
          {opt.categories.map((c) => <Chip key={c} pressed={filters.kategori === c} onClick={() => set({ kategori: filters.kategori === c ? undefined : c })}>{t(`cat.${c}`)}</Chip>)}
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2" role="group" aria-label={t('browse.filters')}>
        <Dropdown label={t('browse.size')} emptyLabel={t('browse.allSizes')} options={filters.str && !opt.sizes.includes(filters.str) ? [...opt.sizes, filters.str].sort(compareSizes) : opt.sizes} value={filters.str ?? ''} onChange={(v) => set({ str: v || undefined })} />
        <Dropdown label={t('browse.condition')} emptyLabel={t('browse.all')} options={opt.conditions.map((c) => ({ value: c, label: t(`cond.${c}`, undefined, c) }))} value={filters.stand ?? ''} onChange={(v) => set({ stand: (v || undefined) as Filters['stand'] })} />
        <Dropdown label={t('browse.price')} emptyLabel={t('browse.allPrices')} options={PRICE_BUCKETS.map((b) => ({ value: b.value, label: t(`price.${b.value}`, undefined, b.label) }))} value={filters.pris ?? ''} onChange={(v) => set({ pris: (v || undefined) as Filters['pris'] })} />
        <Dropdown label={t('browse.brand')} emptyLabel={t('browse.allBrands')} options={opt.brands} value={filters.maerke ?? ''} onChange={(v) => set({ maerke: v || undefined })} />
        <Dropdown className="sm:ml-auto" label={t('browse.sort')} highlightSelected={false} options={SORTS.map((x) => ({ value: x.value, label: t(`sort.${x.value}`, undefined, x.label) }))} value={filters.sort} onChange={(v) => set({ sort: v as Filters['sort'] })} />
      </div>

      <div className="mt-5 flex min-h-9 items-center justify-between gap-4 border-b border-line pb-3">
        <p className="text-small font-semibold" aria-live="polite" aria-atomic="true" data-testid="result-count">
          {n === 1 ? t('browse.count1') : t('browse.countN', { n: num(n) })}
        </p>
        {active > 0 && (
          <button type="button" className="rounded-sm text-small font-semibold text-forest underline underline-offset-4" onClick={() => onChange({ ...DEFAULT_FILTERS, sort: filters.sort })}>
            {t('browse.resetN', { n: active })}
          </button>
        )}
      </div>

      {n > 0 ? (
        <ProductGrid layout="responsive" className="mt-6">
          {result.map((it) => <ItemCard key={it.id} item={it} showSeller={showSeller} />)}
        </ProductGrid>
      ) : (
        <EmptyState icon="search" title={t('browse.none')} description={t('browse.noneDesc')} className="py-12"
          action={<Button variant="outline" onClick={() => onChange({ ...DEFAULT_FILTERS })}>{t('browse.reset')}</Button>} />
      )}
    </div>
  );
}

function BrowseWithParams({ items, opt, types, showSeller }: { items: readonly BrowseItem[]; opt: BrowseOptions; types: readonly string[]; showSeller?: boolean }) {
  const params = useSearchParams();
  const filters = useMemo(() => parseFilters(new URLSearchParams(params.toString()), opt, types.length ? types : opt.types), [params, opt, types]);
  const onChange = (f: Filters) => {
    // Native replaceState (state = null, ellers tror Next.js, det er dets eget kald): useSearchParams synkroniseres uden at hente noget fra serveren
    const qs = filtersToSearch(f, new URLSearchParams(window.location.search));
    window.history.replaceState(null, '', `${window.location.pathname}${qs ? `?${qs}` : ''}`);
  };
  return <BrowseView items={items} opt={opt} filters={filters} onChange={onChange} showSeller={showSeller} />;
}

/**
 * Liste med filtre og sortering. Filtrene står i URL'en (kan deles og overlever genindlæsning).
 * Server-HTML'en viser alle varer med standardfiltre – samme markup som efter hydrering, så intet hopper.
 */
export function Browse({ items, types = [], showCategories = false, showSeller = false }: BrowseProps) {
  const opt = useMemo(() => {
    const o = optionsFor(items, types);
    return showCategories ? o : { ...o, categories: [] };
  }, [items, types, showCategories]);
  return (
    <Suspense fallback={<BrowseView items={items} opt={opt} filters={DEFAULT_FILTERS} onChange={() => {}} showSeller={showSeller} />}>
      <BrowseWithParams items={items} opt={opt} types={types} showSeller={showSeller} />
    </Suspense>
  );
}
