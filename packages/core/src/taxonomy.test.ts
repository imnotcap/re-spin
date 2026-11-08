import { describe, expect, it } from 'vitest';
import { CATEGORIES as CODES } from './validation';
import { CATEGORIES } from './taxonomy';

describe('kategoritræ', () => {
  it('samme kategorier som databasen og valideringen, i samme rækkefølge', () => {
    expect(CATEGORIES.map((c) => c.slug)).toEqual([...CODES]);
  });
  it('underkategorier er unikke inden for kategorien og højst 60 tegn (databasens grænse)', () => {
    for (const c of CATEGORIES) {
      expect(new Set(c.subs).size, c.slug).toBe(c.subs.length);
      for (const s of c.subs) expect(s.length, s).toBeLessThanOrEqual(60);
    }
  });
});
