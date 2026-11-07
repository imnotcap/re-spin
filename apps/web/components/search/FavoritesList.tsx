'use client';

import { useMemo, useSyncExternalStore } from 'react';
import { Button, EmptyState, ProductGrid } from '@respin/ui';
import { ItemCard } from '../ItemCard';
import { getItem, toCard, type Item } from '../../lib/catalog';
import { useFavorites } from '../../lib/favorites';
import { useI18n } from '../../lib/i18n/client';

const noop = () => () => {};
/** false i den statiske HTML og under hydrering, true bagefter */
const useIsClient = () => useSyncExternalStore(noop, () => true, () => false);

export function FavoritesList() {
  const { t } = useI18n();
  const client = useIsClient();
  const { ids } = useFavorites();
  const items = useMemo(() => ids.map((id) => getItem(id)).filter((x): x is Item => x !== undefined), [ids]);

  // Samme plads som optællingen nedenfor, så teksten ikke flytter sig, når listen er hentet (CLS 0)
  if (!client) return <p className="mb-6 text-small text-muted" aria-busy="true">{t('fav.loading')}</p>;
  if (items.length === 0) {
    return (
      <EmptyState icon="heart" title={t('fav.none')} className="py-12"
        description={t('fav.noneDesc')}
        action={<Button href="/soeg/">{t('fav.seeAll')}</Button>} />
    );
  }
  return (
    <>
      <p className="mb-6 text-small text-muted" aria-live="polite">{items.length === 1 ? '1 vare' : `${items.length} varer`}</p>
      <ProductGrid layout="responsive">{items.map((i) => <ItemCard key={i.id} item={toCard(i)} showSeller />)}</ProductGrid>
    </>
  );
}
