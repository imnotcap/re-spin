import { describe, expect, it } from 'vitest';
import { DEFAULT_OG_IMAGE, jsonLd, pageMetadata, priceMeta, productJsonLd, summarize } from './seo';

describe('metadata til deling', () => {
  it('siden får sin egen titel, beskrivelse og adresse i Open Graph og Twitter (ikke layoutets)', () => {
    const m = pageMetadata({ title: 'Frakke med bindebælte – Ganni', description: '450 kr. · Str. M', path: '/annonce/abc/', images: [{ url: 'https://x/1.webp', width: 1600, height: 2000 }] });
    expect(m.title).toBe('Frakke med bindebælte – Ganni');
    expect(m.openGraph).toMatchObject({ title: 'Frakke med bindebælte – Ganni · Videro', description: '450 kr. · Str. M', url: '/annonce/abc/', siteName: 'Videro', locale: 'da_DK' });
    expect((m.openGraph as { images: unknown[] }).images).toEqual([{ url: 'https://x/1.webp', width: 1600, height: 2000, alt: 'Frakke med bindebælte – Ganni' }]);
    expect(m.twitter).toMatchObject({ card: 'summary_large_image', title: 'Frakke med bindebælte – Ganni · Videro' });
    expect(m.alternates).toEqual({ canonical: '/annonce/abc/' });
    expect(m.robots).toBeUndefined();
  });

  it('uden eget billede bruges standardbilledet; noindex kan sættes', () => {
    const m = pageMetadata({ title: 'Gebyrer', description: 'x', path: '/gebyrer/', noindex: true });
    expect((m.openGraph as { images: Array<{ url: string }> }).images[0]!.url).toBe(DEFAULT_OG_IMAGE.url);
    expect(m.robots).toEqual({ index: false, follow: true });
  });

  it('beskrivelser bliver én linje og afkortes ved et ord', () => {
    expect(summarize('  Klassisk\nfrakke   med bælte ')).toBe('Klassisk frakke med bælte');
    const long = summarize('ord '.repeat(80), 60);
    expect(long.length).toBeLessThanOrEqual(60);
    expect(long.endsWith('…')).toBe(true);
    expect(long).not.toMatch(/ …$/);
  });

  it('produktdata: pris i DKK, brugt stand, solgt = udsolgt', () => {
    expect(priceMeta(450, true)).toEqual({ 'product:price:amount': '450.00', 'product:price:currency': 'DKK', 'product:availability': 'in stock', 'product:condition': 'used' });
    const ld = productJsonLd({ name: 'Frakke', description: '', url: 'https://videro.dk/annonce/a/', images: ['https://x/1.webp'], priceKr: 450, available: false, brand: 'Ganni' });
    expect(ld.offers).toMatchObject({ price: '450.00', priceCurrency: 'DKK', availability: 'https://schema.org/SoldOut', itemCondition: 'https://schema.org/UsedCondition' });
    expect(ld.description).toBe('Frakke');
  });

  it('JSON-LD kan ikke lukke script-tagget (tekst fra sælgere)', () => {
    const out = jsonLd({ name: '</script><script>alert(1)</script>' });
    expect(out).not.toContain('</script>');
    expect(JSON.parse(out).name).toBe('</script><script>alert(1)</script>');
  });
});
