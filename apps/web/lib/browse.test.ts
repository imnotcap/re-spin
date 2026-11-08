import { describe, expect, it } from 'vitest';
import { DEFAULT_FILTERS, PRICE_BUCKETS, activeFilterCount, applyFilters, compareSizes, filtersToSearch, optionsFor, parseFilters } from './browse';
import { CATEGORIES } from './categories';

import type { BrowseItem } from './browse';

/** Testdata: et lille udsnit, der dækker størrelser, priser, mærker og sektioner */
let n = 0;
const item = (category: BrowseItem['category'], sub: string, size: string, price: number, brand: string, condition: string, uploaded: number, popularity = 0): BrowseItem =>
  ({ id: `t-${++n}`, title: `${sub} ${n}`, brand, size, condition, price, favorites: 0, icon: 'tag', category, sub, uploaded, popularity });
const all: BrowseItem[] = [
  item('kvinder', 'Frakker og jakker', 'M / 38', 450, 'Ganni', 'Meget god', 1, 12),
  item('kvinder', 'Kjoler', 'S / 36', 320, 'Samsøe Samsøe', 'Ny med mærke', 2, 3),
  item('kvinder', 'Bukser og leggings', 'W28 L30', 280, "Levi's", 'Meget god', 3),
  item('kvinder', 'Sneakers', '39', 560, 'Vans', 'Ny med mærke', 4, 30),
  item('kvinder', 'Håndtasker og skuldertasker', 'One size', 150, 'Vintage', 'God', 5),
  item('maend', 'Trøjer og strik', 'L', 340, 'Wood Wood', 'Meget god', 1, 5),
  item('maend', 'Frakker og jakker', 'XL', 720, 'Norse Projects', 'Meget god', 2),
  item('maend', 'Sneakers', '41', 350, 'Puma', 'Meget god', 3, 50),
  item('maend', 'Støvler', '42', 480, 'Red Wing', 'God', 6),
  item('maend', 'Ure', '38 mm', 1310, 'Skagen', 'God', 9),
  item('boern', 'Overtøj og flyverdragter', '6-9 mdr.', 199, 'Reima', 'Meget god', 1),
  item('hjem', 'Gulvlamper', 'H 150 cm', 700, 'Muuto', 'God', 12)
];
const ITEMS = all;
const itemsIn = (slug: string) => all.filter((i) => i.category === slug);
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
    const r = applyFilters(all, { sort: 'pris-lav', kategori: 'maend', stand: 'Meget god' });
    expect(r.length).toBeGreaterThan(0);
    for (const i of r) { expect(i.category).toBe('maend'); expect(i.condition).toBe('Meget god'); }
    const lav = applyFilters(all, { sort: 'pris-lav' }).map((i) => i.price);
    expect(lav).toEqual([...lav].sort((a, b) => a - b));
    const hoej = applyFilters(all, { sort: 'pris-hoej' }).map((i) => i.price);
    expect(hoej).toEqual([...hoej].sort((a, b) => b - a));
  });

  it('valgmuligheder findes kun, hvis de giver resultater', () => {
    const maend = CATEGORIES.find((c) => c.slug === 'maend')!;
    const xs = itemsIn('maend');
    const o = optionsFor(xs, maend.subs, maend.groups);
    for (const s of o.sizes) expect(applyFilters(xs, { ...DEFAULT_FILTERS, str: s }).length).toBeGreaterThan(0);
    for (const b of o.brands) expect(applyFilters(xs, { ...DEFAULT_FILTERS, maerke: b }).length).toBeGreaterThan(0);
    // Typer i kategoriens rækkefølge, kun dem med varer; sektioner kun dem med varer
    expect(o.types).toEqual(maend.subs.filter((s) => xs.some((i) => i.sub === s)));
    expect(o.groups).toEqual(['Tøj', 'Sko', 'Accessories']);
  });

  it('sektion filtrerer på sektionens underkategorier', () => {
    const maend = CATEGORIES.find((c) => c.slug === 'maend')!;
    const xs = itemsIn('maend');
    const sko = applyFilters(xs, { ...DEFAULT_FILTERS, gruppe: 'Sko' }, maend.groups);
    expect(sko.length).toBeGreaterThan(0);
    for (const i of sko) expect(maend.groups.find((g) => g.label === 'Sko')!.items).toContain(i.sub);
    const o = optionsFor(xs, maend.subs, maend.groups);
    expect(parseFilters(new URLSearchParams('gruppe=Sko'), o).gruppe).toBe('Sko');
    expect(parseFilters(new URLSearchParams('gruppe=Findes%20ikke'), o).gruppe).toBeUndefined();
  });

  it('børnestørrelser sorteres efter alder', () => {
    expect(['2-3 år', '14+ år', '12-18 mdr.', '0-3 mdr.', '6-9 mdr.', '10-11 år'].sort(compareSizes))
      .toEqual(['0-3 mdr.', '6-9 mdr.', '12-18 mdr.', '2-3 år', '10-11 år', '14+ år']);
  });
});

describe('URL', () => {
  it('ukendte og ondsindede værdier ignoreres', () => {
    const f = parseFilters(new URLSearchParams('pris=gratis&sort=<script>&maerke=Findes%20ikke&stand=God&kategori=__proto__'), opt);
    expect(f).toEqual({ ...DEFAULT_FILTERS, stand: 'God', gruppe: undefined, type: undefined, kategori: undefined, str: undefined, pris: undefined, maerke: undefined });
  });

  it('skriv → læs giver de samme filtre, og andre parametre (q) bevares', () => {
    const f = { sort: 'pris-hoej', maerke: "Levi's", pris: '200-499', str: 'W28 L30' } as const;
    const qs = filtersToSearch(f, new URLSearchParams('q=jeans&type=x'));
    const p = new URLSearchParams(qs);
    expect(p.get('q')).toBe('jeans');
    expect(p.has('type')).toBe(false);
    expect(parseFilters(p, opt)).toEqual({ ...DEFAULT_FILTERS, ...f, gruppe: undefined, type: undefined, kategori: undefined, stand: undefined });
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

describe('størrelser fra menuen', () => {
  it('"M" finder både "M" og "M / 38"; ukendte værdier ignoreres', () => {
    const r = applyFilters(all, parseFilters(new URLSearchParams('str=M'), opt));
    expect(r.length).toBeGreaterThan(0);
    expect(r.every((i) => i.size === 'M' || i.size.split(' / ').includes('M'))).toBe(true);
    expect(r.some((i) => i.size === 'M / 38')).toBe(true);
    expect(parseFilters(new URLSearchParams('str=XS'), opt).str).toBe('XS'); // kendt størrelse uden varer → 0 resultater, ikke alle
    expect(applyFilters(all, parseFilters(new URLSearchParams('str=XS'), opt))).toHaveLength(0);
    expect(parseFilters(new URLSearchParams('str=<script>'), opt).str).toBeUndefined();
  });
});

describe('søgning i kategoritræet', () => {
  it('typer fra listen finder underkategorien, også uden ordet i titlen', async () => {
    const { subsMatching } = await import('./categories');
    expect(subsMatching('trenchcoat')).toContain('Frakker og jakker');
    expect(subsMatching('chelsea')).toEqual(expect.arrayContaining(['Støvler']));
    expect(subsMatching('ab')).toEqual([]);
    expect(subsMatching('uldfrakke')).toContain('Frakker og jakker');
  });
});
