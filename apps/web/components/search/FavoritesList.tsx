'use client';

import { useEffect, useState } from 'react';
import { Button, EmptyState, ProductGrid } from '@respin/ui';
import { ItemCard } from '../ItemCard';
import { useFavorites } from '../../lib/favorites';
import { useI18n } from '../../lib/i18n/client';
import { listingToCard } from '../../lib/listing-card';
import type { ListingCardData } from '../../lib/listings';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/** Favoritterne gemmes i browseren; annoncerne hentes fra serveren (kun dem, der stadig er til salg) */
export function FavoritesList() {
  const { t } = useI18n();
  const { ids } = useFavorites();
  const [items, setItems] = useState<ListingCardData[] | null>(null);
  const key = ids.filter((id) => UUID.test(id)).slice(0, 100).join(',');

  useEffect(() => {
    if (!key) { setItems([]); return; }
    const ctrl = new AbortController();
    fetch(`/api/annoncer/?limit=48&ids=${key}`, { signal: ctrl.signal })
      .then((r) => (r.ok ? r.json() : { items: [] })).then((d: { items: ListingCardData[] }) => setItems(d.items)).catch(() => {});
    return () => ctrl.abort();
  }, [key]);

  // Samme plads som optællingen nedenfor, så teksten ikke flytter sig, når listen er hentet (CLS 0)
  if (items === null) return <p className="mb-6 text-small text-muted" aria-busy="true">{t('fav.loading')}</p>;
  if (items.length === 0) {
    return (
      <EmptyState icon="heart" title={t('fav.none')} className="py-12"
        description={t('fav.noneDesc')}
        action={<Button href="/soeg/">{t('fav.seeAll')}</Button>} />
    );
  }
  return (
    <>
      <p className="mb-6 text-small text-muted" aria-live="polite">{items.length === 1 ? t('browse.count1') : t('browse.countN', { n: items.length })}</p>
      <ProductGrid layout="responsive">{items.map((l) => <ItemCard key={l.id} item={listingToCard(l)} showSeller />)}</ProductGrid>
    </>
  );
}
