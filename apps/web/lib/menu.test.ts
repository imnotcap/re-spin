import { describe, expect, it } from 'vitest';
import { CATEGORIES } from './categories';
import { ITEMS, allBrands, itemsIn, menuMeta } from './catalog';

describe('menuens tal', () => {
  const meta = menuMeta();
  it('tallene passer med kataloget', () => {
    for (const c of CATEGORIES) {
      const m = meta.cats[c.slug]; const xs = itemsIn(c.slug);
      expect(m.count).toBe(xs.length);
      expect(m.newWeek).toBe(xs.filter((i) => i.uploaded <= 7).length);
      expect(m.under200).toBe(xs.filter((i) => i.price < 200).length);
      for (const b of m.brands) expect(b.count).toBe(xs.filter((i) => i.brand === b.brand).length);
      if (m.focus) expect(xs.find((i) => i.id === m.focus!.itemId)?.sub).toBe(m.focus.sub);
    }
  });
  it('mærkesiden har alle mærker (undtagen "Vintage") én gang, A–Å', () => {
    const names = allBrands().map((b) => b.brand);
    expect(new Set(names).size).toBe(names.length);
    expect(names).toEqual([...new Set(ITEMS.map((i) => i.brand).filter((b) => b !== 'Vintage'))].sort((a, b) => a.localeCompare(b, 'da')));
    expect(meta.brandTotal).toBe(names.length);
  });
});
