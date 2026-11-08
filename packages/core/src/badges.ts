/**
 * Badges, man låser op ved at bruge Videro. Beregnes ud fra data, der allerede findes (annoncer, salg, sikkerhed,
 * profil, visninger) – intet gemmes særskilt, så et badge altid passer med virkeligheden.
 * Rækkefølgen her er rækkefølgen på profilen.
 */
export interface BadgeStats {
  /** Annoncer, brugeren har sat til salg (inkl. solgte) */
  listings: number;
  /** Solgte varer */
  sold: number;
  certified: boolean;
  /** To-trins-login eller passkey slået til */
  secured: boolean;
  /** Profilnavn, beskrivelse og banner er sat */
  profileComplete: boolean;
  /** Flest visninger på én annonce de seneste 30 dage */
  topListingViews: number;
  /** Antal forskellige kategorier med annoncer */
  categories: number;
  memberSince: Date;
}

export type BadgeId =
  | 'first_listing' | 'seller_10' | 'first_sale' | 'sales_10' | 'sales_50'
  | 'certified' | 'secure' | 'profile' | 'popular' | 'variety' | 'pioneer';

export interface BadgeRule {
  id: BadgeId;
  /** Fremskridt mod målet (fx 3 af 10 salg) – mål 1 for ja/nej-badges */
  progress: (s: BadgeStats) => number;
  goal: number;
  /** Særlige badges vises med lime baggrund */
  special?: boolean;
}

/** Medlemmer fra før denne dato er "Pioner" (Videros første tid) */
export const PIONEER_BEFORE = new Date('2027-07-01T00:00:00Z');
export const POPULAR_VIEWS = 100;

export const BADGES: readonly BadgeRule[] = [
  { id: 'first_listing', progress: (s) => s.listings, goal: 1 },
  { id: 'seller_10', progress: (s) => s.listings, goal: 10 },
  { id: 'first_sale', progress: (s) => s.sold, goal: 1 },
  { id: 'sales_10', progress: (s) => s.sold, goal: 10 },
  { id: 'sales_50', progress: (s) => s.sold, goal: 50, special: true },
  { id: 'certified', progress: (s) => Number(s.certified), goal: 1, special: true },
  { id: 'secure', progress: (s) => Number(s.secured), goal: 1 },
  { id: 'profile', progress: (s) => Number(s.profileComplete), goal: 1 },
  { id: 'popular', progress: (s) => s.topListingViews, goal: POPULAR_VIEWS },
  { id: 'variety', progress: (s) => s.categories, goal: 3 },
  { id: 'pioneer', progress: (s) => Number(s.memberSince < PIONEER_BEFORE), goal: 1, special: true }
];

export interface BadgeState { id: BadgeId; earned: boolean; progress: number; goal: number; special: boolean }

export function computeBadges(s: BadgeStats): BadgeState[] {
  return BADGES.map((b) => {
    const p = Math.max(0, Math.min(b.goal, Math.floor(b.progress(s))));
    return { id: b.id, earned: p >= b.goal, progress: p, goal: b.goal, special: !!b.special };
  });
}
