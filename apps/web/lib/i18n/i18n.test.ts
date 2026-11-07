import { describe, expect, it } from 'vitest';
import da from './da';
import en from './en';
import sv from './sv';
import nb from './nb';
import de from './de';
import { translate } from './index';
import { CATEGORIES, CONDITIONS } from '../categories';

const all = { en, sv, nb, de };
const vars = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(',');

describe('oversættelser', () => {
  it('alle sprog har præcis de samme nøgler og pladsholdere som dansk – og ingen tomme tekster', () => {
    for (const [lang, dict] of Object.entries(all)) {
      expect(Object.keys(dict).sort(), lang).toEqual(Object.keys(da).sort());
      for (const [k, v] of Object.entries(da)) {
        const tr = (dict as Record<string, string>)[k]!;
        expect(tr.trim().length, `${lang} ${k}`).toBeGreaterThan(0);
        expect(vars(tr), `${lang} ${k}`).toBe(vars(v));
      }
      expect((dict['hero.words'] as string).split('|')).toHaveLength(da['hero.words'].split('|').length);
    }
  });

  it('alle kategorier, grupper, typer og stande har en tekst', () => {
    const keys = new Set(Object.keys(da));
    for (const c of CATEGORIES) {
      expect(keys.has(`cat.${c.slug}`) && keys.has(`intro.${c.slug}`), c.slug).toBe(true);
      for (const g of c.groups) {
        expect(keys.has(`group.${g.label}`), g.label).toBe(true);
        for (const s of g.items) expect(keys.has(`sub.${s}`), s).toBe(true);
      }
    }
    for (const c of CONDITIONS) expect(keys.has(`cond.${c}`), c).toBe(true);
  });

  it('pladsholdere udfyldes; ukendte nøgler falder tilbage til dansk og så til fallback', () => {
    expect(translate(en, 'mega.all', { cat: 'Women' })).toBe('All in Women');
    expect(translate({}, 'browse.countN', { n: '1.234' })).toBe('1.234 varer');
    expect(translate(en, 'sub.Findes ikke', undefined, 'Findes ikke')).toBe('Findes ikke');
  });
});
