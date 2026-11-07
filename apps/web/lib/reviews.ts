/**
 * Eksempel-anmeldelser til testversionens sælgere. Fordeles fast (samme hver gang) ud fra sælgerens id,
 * og stjernefordelingen regnes, så gennemsnittet passer med sælgerens vurdering.
 */
import { ITEMS, type Seller } from './catalog';

export interface Review { id: string; author: string; rating: 1 | 2 | 3 | 4 | 5; daysAgo: number; text: string; itemTitle?: string }

const TEXTS: ReadonlyArray<{ rating: Review['rating']; text: string }> = [
  { rating: 5, text: 'Præcis som beskrevet, og den kom allerede dagen efter. Fint pakket ind med et lille håndskrevet kort. Tak!' },
  { rating: 5, text: 'Super sød sælger, der svarede hurtigt på alle mine spørgsmål om mål og pasform.' },
  { rating: 5, text: 'Varen var i endnu bedre stand end på billederne. Handler gerne igen.' },
  { rating: 5, text: 'Hurtig afsendelse og god kommunikation hele vejen. Kan varmt anbefales.' },
  { rating: 5, text: 'Lugtede rent og var nystrøget, da den kom. Det mærker man er en sælger, der går op i det.' },
  { rating: 4, text: 'God handel. Pakken tog et par dage længere end forventet, men varen er fin.' },
  { rating: 5, text: 'Perfekt! Størrelsen passede, og farven er lige som på billedet.' },
  { rating: 5, text: 'Anden gang jeg køber her – lige så god oplevelse som første gang.' },
  { rating: 4, text: 'Lidt mere slid end jeg havde regnet med, men det var nævnt i beskrivelsen. Ærlig sælger.' },
  { rating: 5, text: 'Sendte ekstra billeder af mærket, da jeg spurgte. Meget tryg handel.' },
  { rating: 5, text: 'Velpakket og hurtigt sendt. Tusind tak!' },
  { rating: 3, text: 'Varen er okay, men der gik fire dage, før den blev sendt.' },
  { rating: 5, text: 'Fantastisk kvalitet til prisen. Bliver brugt hver dag.' },
  { rating: 5, text: 'Meget hjælpsom og venlig. Kan kun anbefale at handle her.' }
];
const AUTHORS = ['maja.k', 'emil_genbrug', 'sara.loppe', 'freja', 'oliver.v', 'clara_bc', 'nanna', 'lukas.mo', 'ida.marie', 'victor', 'alma.s', 'mathias.h', 'josefine', 'william_n'];

/** Enkel, fast pseudotilfældighed ud fra en tekst (samme sælger → samme anmeldelser) */
function seeded(seed: string) {
  let h = 2166136261;
  for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return () => { h ^= h << 13; h ^= h >>> 17; h ^= h << 5; return ((h >>> 0) % 10_000) / 10_000; };
}

/** Op til 8 nyeste anmeldelser. Lav vurdering → flere af de mindre gode tekster. */
export function reviewsFor(seller: Seller, max = 8): Review[] {
  const rnd = seeded(seller.id);
  const items = ITEMS.filter((i) => i.sellerId !== seller.id).map((i) => i.title);
  const pool = TEXTS.filter((t) => seller.rating >= 4.85 ? t.rating >= 4 : true);
  const n = Math.min(max, seller.reviews);
  let day = 1 + Math.floor(rnd() * 3);
  return Array.from({ length: n }, (_, i) => {
    const t = pool[Math.floor(rnd() * pool.length)]!;
    day += 1 + Math.floor(rnd() * 9);
    return { id: `${seller.id}-${i}`, author: AUTHORS[Math.floor(rnd() * AUTHORS.length)]!, rating: t.rating, daysAgo: day, text: t.text, itemTitle: rnd() > 0.35 ? items[Math.floor(rnd() * items.length)] : undefined };
  });
}

/** Antal anmeldelser pr. stjerne (5 → 1): summen er `count`, og gennemsnittet rammer `rating` (afrundet) */
export function ratingDistribution(rating: number, count: number): [number, number, number, number, number] {
  if (count <= 0) return [0, 0, 0, 0, 0];
  // Start med lutter femmere; "underskuddet" fordeles på få lave og flest firere (som på rigtige profiler)
  let deficit = Math.max(0, Math.round(5 * count - rating * count));
  const n1 = Math.floor((deficit * 0.08) / 4); deficit -= n1 * 4;
  const n2 = Math.floor((deficit * 0.05) / 3); deficit -= n2 * 3;
  const n3 = Math.floor((deficit * 0.2) / 2); deficit -= n3 * 2;
  const n4 = deficit;
  return [count - n1 - n2 - n3 - n4, n4, n3, n2, n1];
}
