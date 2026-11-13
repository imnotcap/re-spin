import { T } from '../lib/i18n/client';
import { CategoryTile, Chip, EmptyState, Button, ProductGrid, SectionHeader, TrustBar } from '@respin/ui';
import { HomeHero } from '../components/home/HomeHero';
import { SellBanner } from '../components/home/SellBanner';
import { PromotedSellers } from '../components/home/PromotedSellers';
import { promotedSellers, type PromotedSeller } from '../lib/promotions';
import { ItemCard } from '../components/ItemCard';
import { CATEGORIES } from '../lib/catalog';
import { categoryIllustration } from '../lib/images';
import { jsonLd } from '../lib/seo';
import { SITE, SITE_URL, SOCIAL } from '../lib/site';
import { getDb } from '../lib/server';
import { getImageStore } from '../lib/image-store';
import { listForBrowse, type ListingCardData } from '../lib/listings';
import { listingToCard } from '../lib/listing-card';
import { getSiteStats } from '../lib/site-stats';

/** Google: navn, logo og søgefelt for Videro i søgeresultaterne */
const SITE_LD = [
  // sameAs: Videros profiler på sociale medier (samme liste som i footeren) – hjælper Google med at koble dem til Videro
  { '@context': 'https://schema.org', '@type': 'Organization', name: SITE.name, url: `${SITE_URL}/`, logo: `${SITE_URL}/apple-icon.png`, sameAs: SOCIAL.map((s) => s.href) },
  {
    '@context': 'https://schema.org', '@type': 'WebSite', name: SITE.name, url: `${SITE_URL}/`, inLanguage: 'da-DK',
    potentialAction: { '@type': 'SearchAction', target: { '@type': 'EntryPoint', urlTemplate: `${SITE_URL}/soeg/?q={search_term_string}` }, 'query-input': 'required name=search_term_string' }
  }
];

const TRUST = [
  { icon: 'shield', title: <T k="trust.protection" />, href: '/sikkerhed/' },
  { icon: 'tag', title: <T k="trust.free" />, href: '/saadan-virker-det/#gebyrer' },
  { icon: 'eye', title: <T k="trust.price" />, href: '/saadan-virker-det/#gebyrer' },
  { icon: 'truck', title: <T k="trust.shipping" />, href: '/saadan-virker-det/' }
] as const;

const container = 'mx-auto max-w-7xl px-4 sm:px-6';
const head = 'mb-4 px-0';

export default async function HomePage() {
  const [all, stats, sellers] = await Promise.all([
    listForBrowse(getDb(), getImageStore(), {}).catch((e) => { console.error('forside-fejl', e instanceof Error ? e.message : 'ukendt'); return [] as ListingCardData[]; }),
    getSiteStats(),
    promotedSellers(getDb(), getImageStore()).catch(() => [] as PromotedSeller[])
  ]);
  // Hver liste viser andre varer – samme vare går ikke igen længere nede
  const latest = all.slice(0, 12);
  const shown = new Set(latest.map((l) => l.id));
  const popular = all.filter((l) => !shown.has(l.id) && (l.views ?? 0) > 0).sort((a, b) => (b.views ?? 0) - (a.views ?? 0)).slice(0, 6);
  popular.forEach((l) => shown.add(l.id));
  const certified = all.filter((l) => !shown.has(l.id) && l.seller.certified).slice(0, 6);
  const brands = [...stats.brands].sort((a, b) => b.count - a.count).slice(0, 14);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(SITE_LD) }} />
      <HomeHero />

      <div className={`${container} mt-2 border-b border-line sm:mt-4`}>
        <TrustBar items={TRUST} variant="compact" />
      </div>

      <section aria-labelledby="kategorier" className={`${container} mt-10`}>
        <SectionHeader id="kategorier" title={<T k="home.categories" />} className={head} />
        {/* Seks kategorier: 3 × 2 på mobil og tablet, én række på store skærme */}
        <ul className="grid grid-cols-3 gap-3 sm:gap-4 lg:grid-cols-6">
          {CATEGORIES.map((c) => (
            <li key={c.slug} data-track="home_category" data-category={c.slug}>
              <CategoryTile variant="illustration" icon={c.icon} label={<T k={`cat.${c.slug}`} />} href={`/kategori/${c.slug}/`} imageSrc={categoryIllustration(c.slug)} />
            </li>
          ))}
        </ul>
      </section>

      {latest.length === 0 ? (
        <section className={`${container} mt-14`}>
          <EmptyState icon="tag" title={<T k="home.emptyTitle" />} description={<T k="home.emptyDesc" />} className="rounded-lg border border-line py-14"
            action={<Button href="/saelg/ny/" icon="plus" data-track="home_empty_sell"><T k="browse.emptyCta" /></Button>} />
        </section>
      ) : (
        <section aria-labelledby="nyt" className={`${container} mt-14`}>
          <SectionHeader id="nyt" title={<T k="home.justListed" />} action={{ label: <T k="home.seeAll" />, href: '/soeg/' }} className={head} />
          <ProductGrid layout="responsive">
            {latest.map((l) => <ItemCard key={l.id} item={listingToCard(l)} showSeller />)}
          </ProductGrid>
        </section>
      )}

      <PromotedSellers sellers={sellers} className={`${container} mt-16`} />

      <SellBanner />

      {popular.length > 0 && (
        <section aria-labelledby="populaere" className={`${container} mt-16`}>
          <SectionHeader id="populaere" title={<T k="home.popular" />} action={{ label: <T k="home.seeAll" />, href: '/soeg/?sort=populaere' }} className={head} />
          <ProductGrid layout="responsive">
            {popular.map((l) => <ItemCard key={l.id} item={listingToCard(l)} />)}
          </ProductGrid>
        </section>
      )}

      {brands.length >= 3 && (
        <section aria-labelledby="maerker" className={`${container} mt-16`}>
          <SectionHeader id="maerker" title={<T k="home.brands" />} className={head} />
          <ul className="flex flex-wrap gap-2">
            {brands.map((b) => (
              <li key={b.brand}><Chip href={`/soeg/?q=${encodeURIComponent(b.brand)}`}>{b.brand}</Chip></li>
            ))}
          </ul>
        </section>
      )}

      {certified.length >= 2 && (
        <section aria-labelledby="certificerede" className={`${container} mt-16`}>
          <SectionHeader id="certificerede" title={<T k="home.certified" />} description={<T k="home.certifiedDesc" />} className={head} />
          <ProductGrid layout="responsive">
            {certified.map((l) => <ItemCard key={l.id} item={listingToCard(l)} showSeller />)}
          </ProductGrid>
        </section>
      )}
    </>
  );
}
