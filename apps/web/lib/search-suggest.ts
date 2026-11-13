import type { Db } from '@respin/db';
import type { ImageStore } from './image-store';
import { listFeed } from './listings';
import { searchMembers, type MemberHit } from './profile';

/** Forslag i søgefeltet, mens man skriver (offentlige data – det samme for alle) */
export interface SuggestListing { id: string; title: string; brand: string; price: number; image: string | null }
export interface SuggestBrand { brand: string; count: number }
export interface Suggestions { listings: SuggestListing[]; people: MemberHit[]; brands: SuggestBrand[] }

export const EMPTY_SUGGESTIONS: Suggestions = { listings: [], people: [], brands: [] };
const fold = (s: string) => s.normalize('NFC').toLocaleLowerCase('da-DK').trim();

/** Mærker, der matcher: dem, der starter med søgningen, først – derefter flest varer */
export function matchBrands(all: readonly SuggestBrand[], raw: string, limit = 3): SuggestBrand[] {
  const q = fold(raw);
  if (q.length < 2) return [];
  return all
    .map((b) => ({ b, at: fold(b.brand).indexOf(q) }))
    .filter((x) => x.at >= 0)
    .sort((a, b) => (a.at === 0 ? 0 : 1) - (b.at === 0 ? 0 : 1) || b.b.count - a.b.count)
    .slice(0, limit)
    .map((x) => x.b);
}

/** Varer, personer og mærker til søgefeltet. "@navn" giver kun personer. */
export async function suggest(db: Db, store: ImageStore, brands: readonly SuggestBrand[], raw: string): Promise<Suggestions> {
  const q = raw.trim().slice(0, 100);
  if (q.replace(/^@+/, '').length < 2) return EMPTY_SUGGESTIONS;
  const personOnly = q.startsWith('@');
  const [items, people] = await Promise.all([
    personOnly ? Promise.resolve([]) : listFeed(db, store, { q, limit: 5 }),
    searchMembers(db, store, q, personOnly ? 6 : 3)
  ]);
  return {
    listings: items.map((l) => ({ id: l.id, title: l.title, brand: l.brand, price: l.price, image: l.image?.src ?? null })),
    people,
    brands: personOnly ? [] : matchBrands(brands, q)
  };
}
