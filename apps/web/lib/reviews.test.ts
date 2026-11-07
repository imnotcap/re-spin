import { describe, expect, it } from 'vitest';
import { SELLERS } from './catalog';
import { ratingDistribution, reviewsFor } from './reviews';

describe('anmeldelser', () => {
  it('fordelingen summer til antallet, og gennemsnittet ligger tæt på vurderingen', () => {
    for (const s of SELLERS) {
      const d = ratingDistribution(s.rating, s.reviews);
      expect(d.reduce((a, b) => a + b, 0), s.id).toBe(s.reviews);
      expect(d.every((x) => x >= 0), s.id).toBe(true);
      const avg = d.reduce((sum, c, i) => sum + c * (5 - i), 0) / s.reviews;
      expect(Math.abs(avg - s.rating), s.id).toBeLessThan(0.15);
    }
    expect(ratingDistribution(5, 0)).toEqual([0, 0, 0, 0, 0]);
  });
  it('samme sælger får de samme anmeldelser hver gang, nyeste først, højst 8', () => {
    for (const s of SELLERS) {
      const a = reviewsFor(s), b = reviewsFor(s);
      expect(a).toEqual(b);
      expect(a.length).toBe(Math.min(8, s.reviews));
      expect(a.map((r) => r.daysAgo)).toEqual([...a.map((r) => r.daysAgo)].sort((x, y) => x - y));
    }
  });
});
