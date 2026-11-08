/**
 * Metadata til link-forhåndsvisninger (Discord, Facebook, LinkedIn, Slack, iMessage) og søgemaskiner.
 *
 * Next arver `openGraph` og `twitter` fra layoutet SOM HELHED, hvis en side ikke selv sætter dem, og en sides
 * `title` ændrer ikke `og:title`. Uden denne hjælper viser alle links derfor sidens generelle titel og beskrivelse.
 * Brug `pageMetadata()` på alle sider, der kan deles.
 */
import type { Metadata } from 'next';
import { BASE_PATH, SITE } from './site';

/** Standardbillede til deling (1200 × 630) – bruges, når siden ikke har sit eget */
export const DEFAULT_OG_IMAGE = { url: `${BASE_PATH}/og/videro.png`, width: 1200, height: 630, alt: 'Videro – giv det videre' };

export interface OgImage { url: string; width?: number | null; height?: number | null; alt?: string }

/** Én linje uden overflødige mellemrum, højst `max` tegn, afkortet ved et ord */
export function summarize(text: string, max = 160): string {
  const t = text.replace(/\s+/g, ' ').trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max - 1);
  return `${cut.slice(0, Math.max(cut.lastIndexOf(' '), max - 20)).replace(/[\s,.;:–-]+$/, '')}…`;
}

export function pageMetadata(o: {
  /** Sidens titel uden " · Videro" (tilføjes af layoutets skabelon) */
  title: string;
  description: string;
  /** Sti fra roden, fx "/annonce/123/" – bliver til kanonisk adresse og og:url */
  path: string;
  images?: OgImage[];
  /** Skjul fra søgemaskiner (fx annoncer, der er solgt eller venter på gennemgang) */
  noindex?: boolean;
  /** Ekstra meta-tags, fx produktpris */
  other?: Record<string, string>;
}): Metadata {
  const description = summarize(o.description);
  const images = (o.images?.length ? o.images : [DEFAULT_OG_IMAGE]).map((i) => ({
    url: i.url, ...(i.width ? { width: i.width } : {}), ...(i.height ? { height: i.height } : {}), alt: i.alt ?? o.title
  }));
  const fullTitle = `${o.title} · ${SITE.name}`;
  return {
    title: o.title,
    description,
    alternates: { canonical: o.path },
    openGraph: { type: 'website', siteName: SITE.name, locale: 'da_DK', url: o.path, title: fullTitle, description, images },
    twitter: { card: 'summary_large_image', title: fullTitle, description, images: images.map((i) => i.url) },
    ...(o.noindex ? { robots: { index: false, follow: true } } : {}),
    ...(o.other ? { other: o.other } : {})
  };
}

/** Pris som Open Graph-produktdata (læses af fx Facebook og Pinterest) */
export const priceMeta = (kr: number, available: boolean): Record<string, string> => ({
  'product:price:amount': kr.toFixed(2),
  'product:price:currency': 'DKK',
  'product:availability': available ? 'in stock' : 'out of stock',
  'product:condition': 'used'
});

/** Struktureret data (schema.org Product) til Google. Sendes som JSON i et <script type="application/ld+json">. */
export function productJsonLd(p: {
  name: string; description: string; url: string; images: string[]; priceKr: number; available: boolean;
  brand?: string | null; condition?: string; seller?: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: p.name,
    description: summarize(p.description || p.name, 500),
    image: p.images,
    ...(p.brand ? { brand: { '@type': 'Brand', name: p.brand } } : {}),
    offers: {
      '@type': 'Offer',
      url: p.url,
      price: p.priceKr.toFixed(2),
      priceCurrency: 'DKK',
      availability: p.available ? 'https://schema.org/InStock' : 'https://schema.org/SoldOut',
      itemCondition: 'https://schema.org/UsedCondition',
      ...(p.seller ? { seller: { '@type': 'Person', name: p.seller } } : {})
    }
  };
}

/** JSON til <script type="application/ld+json">: "<" escapes, så teksten aldrig kan lukke script-tagget */
export const jsonLd = (data: unknown): string => JSON.stringify(data).replace(/</g, '\\u003c');
