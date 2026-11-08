import { describe, expect, it } from 'vitest';
import { BADGES, PIONEER_BEFORE, computeBadges, type BadgeStats } from './badges';

const base: BadgeStats = { listings: 0, sold: 0, certified: false, secured: false, profileComplete: false, topListingViews: 0, categories: 0, memberSince: new Date('2028-01-01') };
const earned = (s: Partial<BadgeStats>) => computeBadges({ ...base, ...s }).filter((b) => b.earned).map((b) => b.id);

describe('badges', () => {
  it('en ny bruger har ingen badges; ids er unikke', () => {
    expect(earned({})).toEqual([]);
    expect(new Set(BADGES.map((b) => b.id)).size).toBe(BADGES.length);
  });
  it('låses op ved målet, og fremskridt stopper ved målet', () => {
    expect(earned({ listings: 1 })).toEqual(['first_listing']);
    expect(earned({ listings: 12, sold: 10 })).toEqual(['first_listing', 'seller_10', 'first_sale', 'sales_10']);
    const s = computeBadges({ ...base, sold: 3 }).find((b) => b.id === 'sales_10')!;
    expect(s).toMatchObject({ earned: false, progress: 3, goal: 10 });
    expect(computeBadges({ ...base, sold: 999 }).find((b) => b.id === 'sales_50')!.progress).toBe(50);
  });
  it('ja/nej-badges og pioner', () => {
    expect(earned({ certified: true, secured: true, profileComplete: true })).toEqual(['certified', 'secure', 'profile']);
    expect(earned({ memberSince: new Date(PIONEER_BEFORE.getTime() - 1) })).toEqual(['pioneer']);
    expect(earned({ topListingViews: 100, categories: 3 })).toEqual(['popular', 'variety']);
  });
});
