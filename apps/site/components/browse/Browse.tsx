'use client';

import { Suspense, useId, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button, Chip, EmptyState, Icon, ProductGrid, Select } from '@respin/ui';
import { ItemCard } from '../ItemCard';
import { CATEGORIES } from '../../lib/categories';
import {
  DEFAULT_FILTERS, PRICE_BUCKETS, SORTS, activeFilterCount, applyFilters, filtersToSearch, optionsFor, parseFilters,
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

const catLabel = (slug: string) => CATEGORIES.find((c) => c.slug === slug)?.label ?? slug;

function BrowseView({ items, opt, filters, onChange, showSeller }: { items: readonly BrowseItem[]; opt: BrowseOptions; filters: Filters; onChange: (f: Filters) => void; showSeller?: boolean }) {
  const result = useMemo(() => applyFilters(items, filters), [items, filters]);
  const active = activeFilterCount(filters);
  const set = (patch: Partial<Filters>) => onChange({ ...filters, ...patch });
  const n = result.length;
  // Mobil: filtrene ligger bag én knap, så varerne kommer hurtigt i syne. Fra tablet og op står de åbne.
  const [showFilters, setShowFilters] = useState(false);
  const panelId = useId();

  return (
    <div>
      {opt.types.length > 1 && (
        <div role="group" aria-label="Type" className="flex flex-wrap gap-2">
          <Chip pressed={!filters.type} onClick={() => set({ type: undefined })}>Alle</Chip>
          {opt.types.map((t) => <Chip key={t} pressed={filters.type === t} onClick={() => set({ type: filters.type === t ? undefined : t })}>{t}</Chip>)}
        </div>
      )}
      {opt.categories.length > 1 && (
        <div role="group" aria-label="Kategori" className="flex flex-wrap gap-2">
          <Chip pressed={!filters.kategori} onClick={() => set({ kategori: undefined })}>Alle</Chip>
          {opt.categories.map((c) => <Chip key={c} pressed={filters.kategori === c} onClick={() => set({ kategori: filters.kategori === c ? undefined : c })}>{catLabel(c)}</Chip>)}
        </div>
      )}

      <button type="button" className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-md border border-stone-300 bg-surface text-small font-semibold sm:hidden"
        aria-expanded={showFilters} aria-controls={panelId} onClick={() => setShowFilters((v) => !v)}>
        <Icon name="filter" size={18} />
        Filtre og sortering{active > 0 ? ` (${active})` : ''}
        <Icon name={showFilters ? 'up' : 'down'} size={16} />
      </button>
      <div id={panelId} className={`mt-4 grid-cols-2 gap-x-3 gap-y-1 sm:mt-5 sm:grid sm:grid-cols-3 lg:grid-cols-5 ${showFilters ? 'grid' : 'hidden'}`}>
        <Select label="Størrelse" emptyOption="Alle" options={opt.sizes} value={filters.str ?? ''} onChange={(e) => set({ str: e.target.value || undefined })} />
        <Select label="Stand" emptyOption="Alle" options={[...opt.conditions]} value={filters.stand ?? ''} onChange={(e) => set({ stand: (e.target.value || undefined) as Filters['stand'] })} />
        <Select label="Pris" emptyOption="Alle priser" options={PRICE_BUCKETS.map((b) => ({ value: b.value, label: b.label }))} value={filters.pris ?? ''} onChange={(e) => set({ pris: (e.target.value || undefined) as Filters['pris'] })} />
        <Select label="Mærke" emptyOption="Alle mærker" options={opt.brands} value={filters.maerke ?? ''} onChange={(e) => set({ maerke: e.target.value || undefined })} />
        <Select label="Sortér efter" className="col-span-2 sm:col-span-1" options={SORTS.map((s) => ({ value: s.value, label: s.label }))} value={filters.sort} onChange={(e) => set({ sort: e.target.value as Filters['sort'] })} />
      </div>

      <div className="mt-4 flex min-h-9 items-center justify-between gap-4 border-b border-line pb-3">
        <p className="text-small font-semibold" aria-live="polite" aria-atomic="true" data-testid="result-count">
          {n === 1 ? '1 vare' : `${n.toLocaleString('da-DK')} varer`}
        </p>
        {active > 0 && (
          <button type="button" className="rounded-sm text-small font-semibold text-forest underline underline-offset-4" onClick={() => onChange({ ...DEFAULT_FILTERS, sort: filters.sort })}>
            Nulstil filtre ({active})
          </button>
        )}
      </div>

      {n > 0 ? (
        <ProductGrid layout="responsive" className="mt-6">
          {result.map((it) => <ItemCard key={it.id} item={it} showSeller={showSeller} />)}
        </ProductGrid>
      ) : (
        <EmptyState icon="search" title="Ingen varer matcher" description="Prøv at fjerne et eller flere filtre." className="py-12"
          action={<Button variant="outline" onClick={() => onChange({ ...DEFAULT_FILTERS })}>Nulstil filtre</Button>} />
      )}
    </div>
  );
}

function BrowseWithParams({ items, opt, showSeller }: { items: readonly BrowseItem[]; opt: BrowseOptions; showSeller?: boolean }) {
  const params = useSearchParams();
  const filters = useMemo(() => parseFilters(new URLSearchParams(params.toString()), opt), [params, opt]);
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
      <BrowseWithParams items={items} opt={opt} showSeller={showSeller} />
    </Suspense>
  );
}
