'use client';

import { ProductCard, useToast } from '@respin/ui';
import type { IconName } from '@respin/ui';
import { useFavorites } from '../lib/favorites';
import { itemImage } from '../lib/images';

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
}

/** Kittets produktkort koblet til favoritterne. Tælleren inkluderer dit eget hjerte, når du har gemt varen. */
export function ItemCard({ item, showSeller = false }: { item: CardItem; showSeller?: boolean }) {
  const fav = useFavorites();
  const { toast } = useToast();
  const on = fav.has(item.id);
  const photo = itemImage(item.id);
  return (
    <ProductCard
      product={{ id: item.id, title: item.title, brand: item.brand, size: item.size, condition: item.condition, price: item.price, imageUrl: photo.src, imageSrcSet: photo.srcSet }}
      href={`/vare/${item.id}/`}
      badge={item.vintage ? 'Vintage' : undefined}
      placeholderIcon={item.icon}
      favoriteCount={item.favorites + (on ? 1 : 0)}
      seller={showSeller ? item.seller : undefined}
      favorite={on}
      onFavoriteChange={(next) => {
        fav.set(item.id, next);
        toast(next ? 'Gemt i dine favoritter' : 'Fjernet fra dine favoritter', { icon: 'heart' });
      }}
    />
  );
}
