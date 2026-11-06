import { describe, expect, it } from 'vitest';
import { ICON_NAMES } from '@respin/ui/utils';
import { MAX_PRICE_ORE, MIN_PRICE_ORE } from '@respin/core/limits';
import { CATEGORIES, CONDITIONS, ITEMS, SELLERS, getItem, itemsBySeller, mostPopular, newest, normalize, popularBrands, searchItems, similarTo } from './catalog';

describe('katalogets integritet', () => {
  it('id’er er unikke og URL-sikre', () => {
    const ids = ITEMS.map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(/^[a-z0-9-]+$/);
    expect(new Set(SELLERS.map((s) => s.id)).size).toBe(SELLERS.length);
  });

  it('hver vare har en eksisterende sælger, kategori, underkategori, stand og ikon', () => {
    for (const i of ITEMS) {
      expect(SELLERS.some((s) => s.id === i.sellerId), i.id).toBe(true);
      const c = CATEGORIES.find((x) => x.slug === i.category);
      expect(c, i.id).toBeDefined();
      expect(c!.subs, i.id).toContain(i.sub);
      expect(CONDITIONS, i.id).toContain(i.condition);
      expect(ICON_NAMES, i.id).toContain(i.icon);
      expect(ICON_NAMES).toContain(c!.icon);
    }
  });

  it('priser er hele kroner inden for platformens grænser', () => {
    for (const i of ITEMS) {
      expect(Number.isInteger(i.price), i.id).toBe(true);
      expect(i.price * 100).toBeGreaterThanOrEqual(MIN_PRICE_ORE);
      expect(i.price * 100).toBeLessThanOrEqual(MAX_PRICE_ORE);
      expect(i.photos).toBeGreaterThanOrEqual(1);
      expect(i.photos).toBeLessThanOrEqual(8);
    }
  });

  it('alle kategorier og sælgere har varer', () => {
    for (const c of CATEGORIES) expect(ITEMS.some((i) => i.category === c.slug), c.slug).toBe(true);
    for (const s of SELLERS) expect(itemsBySeller(s.id).length, s.id).toBeGreaterThan(0);
  });
});

describe('lister og søgning', () => {
  it('nyeste og mest populære er sorteret og indeholder alle varer', () => {
    const n = newest();
    expect(n).toHaveLength(ITEMS.length);
    for (let k = 1; k < n.length; k++) expect(n[k]!.uploaded).toBeGreaterThanOrEqual(n[k - 1]!.uploaded);
    const p = mostPopular();
    for (let k = 1; k < p.length; k++) expect(p[k]!.favorites).toBeLessThanOrEqual(p[k - 1]!.favorites);
  });

  it('lignende varer er fra samme kategori og aldrig varen selv', () => {
    for (const i of ITEMS) {
      const s = similarTo(i);
      expect(s.some((x) => x.id === i.id)).toBe(false);
      for (const x of s) expect(x.category).toBe(i.category);
    }
  });

  it('søgning: mærke, flere ord (AND), store/små bogstaver, accenter og æøå', () => {
    expect(searchItems('levis').map((i) => i.brand)).toEqual(["Levi's", "Levi's"]); // apostroffen er valgfri
    expect(searchItems("levi's")).toEqual(searchItems('levis'));
    expect(searchItems('dr martens').map((i) => i.id)).toEqual(['4004-dr-martens-1460']);
    expect(searchItems('Dr. Martens')).toEqual(searchItems('dr martens'));
    expect(searchItems('ADIDAS').map((i) => i.id)).toEqual(['4001-adidas-samba']);
    expect(searchItems('jakke sort').every((i) => normalize(`${i.title} ${i.sub} ${i.color}`).includes('sort'))).toBe(true);
    expect(searchItems('kähler').map((i) => i.id)).toEqual(['7002-kaehler-vase']);
    expect(searchItems('Mads Nørgaard').map((i) => i.id)).toEqual(['2002-mads-norgaard-strik']);
    expect(searchItems('skåret').length).toBe(0);
    expect(searchItems('   ')).toHaveLength(ITEMS.length);
    expect(searchItems('vintage').length).toBeGreaterThanOrEqual(ITEMS.filter((i) => i.vintage).length);
  });

  it('normalize fjerner accenter men bevarer å, æ og ø', () => {
    expect(normalize('  Café   Crème ')).toBe('cafe creme');
    expect(normalize("Levi's 501, W30/L32")).toBe('levis 501 w30 l32');
    expect(normalize('Blå Ærme Øko')).toBe('blå ærme øko');
    expect(normalize('Blå')).toHaveLength(3);
  });

  it('populære mærker tæller korrekt og udelader "Vintage"', () => {
    const b = popularBrands(50);
    expect(b.find((x) => x.brand === 'Vintage')).toBeUndefined();
    expect(b.find((x) => x.brand === "Levi's")?.count).toBe(2);
    expect(getItem('findes-ikke')).toBeUndefined();
  });
});
