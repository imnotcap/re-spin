'use client';

import { ProductCard, useToast } from '@respin/ui';
import type { IconName } from '@respin/ui';
import { useFavorites } from '../lib/favorites';
import { useOwnListingIds } from '../lib/me';
import { track } from '../lib/analytics';
import { useI18n } from '../lib/i18n/client';

/** Det kortet skal bruge – sendes fra serveren, så hele kataloget ikke skal med i browserens bundle. */
export interface CardItem {
  id: string;
  title: string;
  brand: string;
  size: string;
  condition: string;
  price: number;
  favorites: number;
  icon: IconName;
  vintage?: boolean;
  seller?: { name: string; certified: boolean };
  /** Annoncens foto og side (/annonce/<id>/) */
  image?: { src: string; srcSet?: string } | null;
  href?: string;
  /** Mærke på billedet, fx "Fremhævet" */
  badge?: string;
}

/** Kittets produktkort koblet til favoritterne. Tælleren inkluderer dit eget hjerte, når du har gemt varen. */
export function ItemCard({ item, showSeller = false }: { item: CardItem; showSeller?: boolean }) {
  const fav = useFavorites();
  const own = useOwnListingIds().has(item.id);
  const { toast } = useToast();
  const on = !own && fav.has(item.id);
  const { t } = useI18n();
  return (
    // data-track: klik på kortet tælles i statistikken (uden cookies)
    <div data-track="card" data-listing={item.id} className="contents">
    <ProductCard
      product={{ id: item.id, title: item.title, brand: item.brand, size: item.size, condition: t(`cond.${item.condition}`, undefined, item.condition), price: item.price, imageUrl: item.image?.src, imageSrcSet: item.image?.srcSet }}
      href={item.href ?? `/annonce/${item.id}/`}
      badge={item.badge ?? (item.vintage ? 'Vintage' : undefined)}
      placeholderIcon={item.icon}
      favoriteCount={item.favorites + (on ? 1 : 0)}
      seller={showSeller ? item.seller : undefined}
      favorite={on}
      // Man kan ikke sætte hjerte på sine egne annoncer
      hideFavorite={own}
      onFavoriteChange={(next) => {
        if (own) return;
        fav.set(item.id, next);
        track('favorite', { listingId: item.id, num: next ? 1 : -1 });
        toast(next ? t('fav.saved') : t('fav.removed'), { icon: 'heart' });
      }}
    />
    </div>
  );
}
