/** Medlemsannonce → produktkort. Sikker i browseren (kun typer fra serveren). */
import type { CardItem } from '../components/ItemCard';
import type { ListingCardData } from './listings';
import type { BrowseItem } from './browse';
import { CATEGORIES } from './categories';
import { daysSince } from './catalog';

export const listingToCard = (l: ListingCardData): CardItem => ({
  id: l.id, title: l.title, brand: l.brand, size: l.size, condition: l.condition, price: l.price, favorites: 0,
  icon: CATEGORIES.find((c) => c.slug === l.category)?.icon ?? 'tag', seller: l.seller,
  image: l.image ? { src: l.image.src, srcSet: l.image.srcSet } : null, href: `/annonce/${l.id}/`, badge: l.promoted ? 'Fremhævet' : undefined
});

/** Til lister med filtre: kategori, underkategori, alder og popularitet (visninger) */
export const listingToBrowse = (l: ListingCardData, now = Date.now()): BrowseItem => ({
  ...listingToCard(l), category: l.category, sub: l.sub, uploaded: daysSince(l.createdAt, now), popularity: l.views ?? 0
});
