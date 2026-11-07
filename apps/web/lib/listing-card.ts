/** Medlemsannonce → produktkort. Sikker i browseren (kun typer fra serveren). */
import type { CardItem } from '../components/ItemCard';
import type { ListingCardData } from './listings';
import { CATEGORIES } from './categories';

export const listingToCard = (l: ListingCardData): CardItem => ({
  id: l.id, title: l.title, brand: l.brand, size: l.size, condition: l.condition, price: l.price, favorites: 0,
  icon: CATEGORIES.find((c) => c.slug === l.category)?.icon ?? 'tag', seller: l.seller,
  image: l.image ? { src: l.image.src, srcSet: l.image.srcSet } : null, href: `/annonce/${l.id}/`, badge: l.promoted ? 'Fremhævet' : undefined
});
