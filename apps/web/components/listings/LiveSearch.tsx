'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { ProductGrid, SectionHeader } from '@respin/ui';
import { ItemCard } from '../ItemCard';
import { listingToCard } from '../../lib/listing-card';
import { useI18n } from '../../lib/i18n/client';
import type { ListingCardData } from '../../lib/listings';

/** Søgning i medlemmernes annoncer (server-bygget). Vises under eksempelvarerne, så intet hopper, når svaret kommer. */
export function LiveSearch() {
  const { t } = useI18n();
  const q = (useSearchParams().get('q') ?? '').slice(0, 100);
  const [items, setItems] = useState<ListingCardData[]>([]);
  useEffect(() => {
    const ctrl = new AbortController();
    const t = setTimeout(() => {
      fetch(`/api/annoncer/?limit=24&q=${encodeURIComponent(q)}`, { signal: ctrl.signal })
        .then((r) => (r.ok ? r.json() : { items: [] })).then((d: { items: ListingCardData[] }) => setItems(d.items)).catch(() => {});
    }, 250); // vent til brugeren holder pause i skrivningen
    return () => { clearTimeout(t); ctrl.abort(); };
  }, [q]);
  if (!items.length) return null;
  return (
    <section aria-labelledby="medlemmer" className="mt-14">
      <SectionHeader id="medlemmer" title={t('search.members')} className="px-0" />
      <ProductGrid layout="responsive">{items.map((l) => <ItemCard key={l.id} item={listingToCard(l)} showSeller />)}</ProductGrid>
    </section>
  );
}
