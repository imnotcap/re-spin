import { describe, expect, it } from 'vitest';
import { ITEMS, itemsIn, newest, toBrowse } from './catalog';
import { DEFAULT_FILTERS, PRICE_BUCKETS, activeFilterCount, applyFilters, compareSizes, filtersToSearch, optionsFor, parseFilters } from './browse';
import { CATEGORIES } from './categories';

const all = newest().map(toBrowse);
const opt = optionsFor(all, CATEGORIES.flatMap((c) => c.subs));

describe('filtre', () => {
  it('uden filtre: alle varer, nyeste først', () => {
    const r = applyFilters(all, DEFAULT_FILTERS);
    expect(r).toHaveLength(ITEMS.length);
    for (let k = 1; k < r.length; k++) expect(r[k]!.uploaded).toBeGreaterThanOrEqual(r[k - 1]!.uploaded);
  });

  it('prisintervaller dækker alt præcis én gang (ingen huller eller overlap)', () => {
    let sum = 0;
    for (const b of PRICE_BUCKETS) sum += applyFilters(all, { ...DEFAULT_FILTERS, pris: b.value }).length;
    expect(sum).toBe(ITEMS.length);
    expect(applyFilters(all, { ...DEFAULT_FILTERS, pris: '200-499' }).every((i) => i.price >= 200 && i.price < 500)).toBe(true);
  });

  it('kombinerede filtre er OG, og sortering efter pris virker begge veje', () => {
    const r = applyFilters(all, { sort: 'pris-lav', kategori: 'sko', stand: 'Meget god' });
    expect(r.length).toBeGreaterThan(0);
    for (const i of r) { expect(i.category).toBe('sko'); expect(i.condition).toBe('Meget god'); }
    const lav = applyFilters(all, { sort: 'pris-lav' }).map((i) => i.price);
    expect(lav).toEqual([...lav].sort((a, b) => a - b));
    const hoej = applyFilters(all, { sort: 'pris-hoej' }).map((i) => i.price);
    expect(hoej).toEqual([...hoej].sort((a, b) => b - a));
  });

  it('valgmuligheder findes kun, hvis de giver resultater', () => {
    const sko = itemsIn('sko').map(toBrowse);
    const o = optionsFor(sko, CATEGORIES.find((c) => c.slug === 'sko')!.subs);
    for (const s of o.sizes) expect(applyFilters(sko, { ...DEFAULT_FILTERS, str: s }).length).toBeGreaterThan(0);
    for (const b of o.brands) expect(applyFilters(sko, { ...DEFAULT_FILTERS, maerke: b }).length).toBeGreaterThan(0);
    expect(o.types).toEqual(['Sneakers', 'Støvler', 'Sandaler']);
  });
});

describe('URL', () => {
  it('ukendte og ondsindede værdier ignoreres', () => {
    const f = parseFilters(new URLSearchParams('pris=gratis&sort=<script>&maerke=Findes%20ikke&stand=God&kategori=__proto__'), opt);
    expect(f).toEqual({ ...DEFAULT_FILTERS, stand: 'God', type: undefined, kategori: undefined, str: undefined, pris: undefined, maerke: undefined });
  });

  it('skriv → læs giver de samme filtre, og andre parametre (q) bevares', () => {
    const f = { sort: 'pris-hoej', maerke: "Levi's", pris: '200-499', str: 'W28 L30' } as const;
    const qs = filtersToSearch(f, new URLSearchParams('q=jeans&type=x'));
    const p = new URLSearchParams(qs);
    expect(p.get('q')).toBe('jeans');
    expect(p.has('type')).toBe(false);
    expect(parseFilters(p, opt)).toEqual({ ...DEFAULT_FILTERS, ...f, type: undefined, kategori: undefined, stand: undefined });
    expect(filtersToSearch(DEFAULT_FILTERS, new URLSearchParams())).toBe('');
    expect(activeFilterCount(f)).toBe(3);
  });
});

describe('størrelser', () => {
  it('bogstavstørrelser i rækkefølge, tal naturligt, "One size" sidst', () => {
    expect(['XL', 'One size', 'S', 'M / 38', 'L', 'XS / 34'].sort(compareSizes)).toEqual(['XS / 34', 'S', 'M / 38', 'L', 'XL', 'One size']);
    expect(['104 cm', '98 cm', '110 cm'].sort(compareSizes)).toEqual(['98 cm', '104 cm', '110 cm']);
  });
});

describe('typer fra megamenuen', () => {
  it('en kendt type uden varer giver 0 resultater (ikke alle varer); ukendte ignoreres', async () => {
    const { CATEGORIES } = await import('./categories');
    const kvinder = CATEGORIES.find((c) => c.slug === 'kvinder')!;
    const items = all.filter((i) => i.category === 'kvinder');
    const o = optionsFor(items, kvinder.subs);
    expect(o.types).not.toContain('Nederdele');
    const f = parseFilters(new URLSearchParams('type=Nederdele'), o, kvinder.subs);
    expect(f.type).toBe('Nederdele');
    expect(applyFilters(items, f)).toHaveLength(0);
    expect(parseFilters(new URLSearchParams('type=Findes ikke'), o, kvinder.subs).type).toBeUndefined();
  });
});
