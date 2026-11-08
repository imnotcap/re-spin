'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button, Chip, Dropdown, EmptyState, ProductGrid } from '@respin/ui';
import { ItemCard } from '../ItemCard';
import { useI18n } from '../../lib/i18n/client';
import { CATEGORIES, type CategoryGroup, type CategorySlug } from '../../lib/categories';
import {
  DEFAULT_FILTERS, PRICE_BUCKETS, SORTS, activeFilterCount, compareSizes, applyFilters, filtersToSearch, optionsFor, parseFilters,
  type BrowseItem, type Filters
} from '../../lib/browse';

/** Så mange kort vises ad gangen – resten med "Vis flere" (mindre HTML og hurtigere første visning på mobil) */
export const PAGE_SIZE = 24;
const NO_GROUPS: readonly CategoryGroup[] = [];

export interface BrowseProps {
  items: readonly BrowseItem[];
  /** Kategorisiden: sektioner og underkategorier som chips */
  category?: CategorySlug;
  /** Vis kategorier som chips (søgning og favoritter) */
  showCategories?: boolean;
  /** Vis sælger over kortene */
  showSeller?: boolean;
  /**
   * Adressens søgeparametre, som serveren har læst ("?type=…"). Så er første HTML allerede filtreret, og listen
   * skal ikke vente på browseren. Udeladt (statisk eksport): læses fra adressen, når siden er indlæst.
   */
  query?: string;
}

/**
 * Liste med filtre og sortering. Filtrene står i URL'en (kan deles og overlever genindlæsning) og skrives med
 * history.replaceState – der hentes intet fra nettet. Ingen Suspense/useSearchParams: serveren sender listen én gang.
 */
export function Browse({ items, category, showCategories = false, showSeller = false, query }: BrowseProps) {
  const { t, n: num } = useI18n();
  const cat = category ? CATEGORIES.find((c) => c.slug === category) : undefined;
  const groups = cat?.groups ?? NO_GROUPS;
  const opt = useMemo(() => {
    const o = optionsFor(items, cat?.subs ?? [], groups);
    return showCategories ? o : { ...o, categories: [] };
  }, [items, cat, groups, showCategories]);

  const [search, setSearch] = useState(query ?? '');
  useEffect(() => { if (query === undefined) setSearch(window.location.search); }, [query]);
  const filters = useMemo(() => parseFilters(new URLSearchParams(search), opt, cat?.subs ?? opt.types, groups.map((g) => g.label)), [search, opt, cat, groups]);
  const result = useMemo(() => applyFilters(items, filters, groups), [items, filters, groups]);
  const [shown, setShown] = useState(PAGE_SIZE);

  const onChange = (f: Filters) => {
    const qs = filtersToSearch(f, new URLSearchParams(window.location.search));
    // Native replaceState (state = null, ellers tror Next.js, det er dets eget kald)
    window.history.replaceState(null, '', `${window.location.pathname}${qs ? `?${qs}` : ''}`);
    setSearch(qs ? `?${qs}` : '');
    setShown(PAGE_SIZE);
  };
  const set = (patch: Partial<Filters>) => onChange({ ...filters, ...patch });
  const active = activeFilterCount(filters);
  const n = result.length;

  // Sektion: valgt eller den, typen hører til. Typer vises kun inden for en sektion, når kategorien har flere.
  const group = groups.find((g) => g.label === filters.gruppe) ?? (filters.type ? groups.find((g) => g.items.includes(filters.type!)) : undefined);
  const typeChoices = groups.length > 1 ? (group ? opt.types.filter((x) => group.items.includes(x)) : []) : opt.types;
  const types = filters.type && !typeChoices.includes(filters.type) ? [...typeChoices, filters.type] : typeChoices;

  return (
    <div>
      {opt.groups.length > 1 && (
        <div role="group" aria-label={t('browse.section')} className="flex flex-wrap gap-2">
          <Chip pressed={!filters.gruppe} onClick={() => set({ gruppe: undefined, type: undefined })}>{t('browse.all')}</Chip>
          {opt.groups.map((g) => <Chip key={g} pressed={filters.gruppe === g} onClick={() => set({ gruppe: filters.gruppe === g ? undefined : g, type: undefined })}>{t(`group.${g}`, undefined, g)}</Chip>)}
        </div>
      )}
      {(types.length > 1 || (filters.type && types.length > 0)) && (
        <div role="group" aria-label={t('browse.type')} className={`flex flex-wrap gap-2 ${opt.groups.length > 1 ? 'mt-3' : ''}`}>
          <Chip pressed={!filters.type} onClick={() => set({ type: undefined })}>{t('browse.all')}</Chip>
          {types.map((x) => <Chip key={x} pressed={filters.type === x} onClick={() => set({ type: filters.type === x ? undefined : x })}>{t(`sub.${x}`, undefined, x)}</Chip>)}
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
        <>
          <ProductGrid layout="responsive" className="mt-6">
            {result.slice(0, shown).map((it) => <ItemCard key={it.id} item={it} showSeller={showSeller} />)}
          </ProductGrid>
          {n > shown && (
            <div className="mt-8 flex flex-col items-center gap-3">
              <p className="text-small text-muted">{t('browse.showing', { shown: num(shown), n: num(n) })}</p>
              <Button variant="outline" onClick={() => setShown((s) => s + PAGE_SIZE)}>{t('browse.more')}</Button>
            </div>
          )}
        </>
      ) : (
        <EmptyState icon="search" title={t('browse.none')} description={t('browse.noneDesc')} className="py-12"
          action={<Button variant="outline" onClick={() => onChange({ ...DEFAULT_FILTERS })}>{t('browse.reset')}</Button>} />
      )}
    </div>
  );
}
