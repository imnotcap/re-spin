import { LiveSection } from '@respin-live';
import { T } from '../lib/i18n/client';
import { CategoryTile, Chip, ProductGrid, SectionHeader, TrustBar } from '@respin/ui';
import { HomeHero } from '../components/home/HomeHero';
import { SellBanner } from '../components/home/SellBanner';
import { ItemCard } from '../components/ItemCard';
import { CATEGORIES, countIn, fromCertified, mostPopular, newest, popularBrands, toCard } from '../lib/catalog';
import { categoryImage } from '../lib/images';
import { jsonLd } from '../lib/seo';
import { SITE, SITE_URL } from '../lib/site';

/** Google: navn, logo og søgefelt for Videro i søgeresultaterne */
const SITE_LD = [
  { '@context': 'https://schema.org', '@type': 'Organization', name: SITE.name, url: `${SITE_URL}/`, logo: `${SITE_URL}/apple-icon.png` },
  {
    '@context': 'https://schema.org', '@type': 'WebSite', name: SITE.name, url: `${SITE_URL}/`, inLanguage: 'da-DK',
    potentialAction: { '@type': 'SearchAction', target: { '@type': 'EntryPoint', urlTemplate: `${SITE_URL}/soeg/?q={search_term_string}` }, 'query-input': 'required name=search_term_string' }
  }
];

const TRUST = [
  { icon: 'shield', title: <T k="trust.protection" />, href: '/sikkerhed/' },
  { icon: 'tag', title: <T k="trust.free" />, href: '/gebyrer/' },
  { icon: 'eye', title: <T k="trust.price" />, href: '/gebyrer/' },
  { icon: 'truck', title: <T k="trust.shipping" />, href: '/saadan-virker-det/' }
] as const;

const container = 'mx-auto max-w-7xl px-4 sm:px-6';
const head = 'mb-4 px-0';

export default function HomePage() {
  // Hver liste viser nye varer – samme vare går ikke igen længere nede
  const latest = newest(12);
  const shown = new Set(latest.map((i) => i.id));
  // Certificerede: højst to pr. sælger (så flere sælgere ses), fyldt op hvis der er for få
  const certPool = fromCertified().filter((i) => !shown.has(i.id));
  const perSeller = new Map<string, number>();
  const spread = certPool.filter((i) => {
    const n = (perSeller.get(i.sellerId) ?? 0) + 1;
    perSeller.set(i.sellerId, n);
    return n <= 2;
  });
  const certified = [...spread, ...certPool.filter((i) => !spread.includes(i))].slice(0, 6);
  certified.forEach((i) => shown.add(i.id));
  const popular = mostPopular().filter((i) => !shown.has(i.id)).slice(0, 6);
  const brands = popularBrands(14);

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
            <li key={c.slug}>
              <CategoryTile variant="photo" icon={c.icon} label={<T k={`cat.${c.slug}`} />} count={countIn(c.slug)} href={`/kategori/${c.slug}/`} imageSrc={categoryImage(c.slug).src} imageSrcSet={categoryImage(c.slug).srcSet} />
            </li>
          ))}
        </ul>
      </section>

      <LiveSection id="medlemmer" title={<T k="home.justListed" />} className={`${container} mt-14`} />

      <section aria-labelledby="nyt" className={`${container} mt-14`}>
        <SectionHeader id="nyt" title={<T k="home.new" />} action={{ label: <T k="home.seeAll" />, href: '/soeg/' }} className={head} />
        <ProductGrid layout="responsive">
          {latest.map((it) => <ItemCard key={it.id} item={toCard(it)} showSeller />)}
        </ProductGrid>
      </section>

      <SellBanner />

      <section aria-labelledby="populaere" className={`${container} mt-16`}>
        <SectionHeader id="populaere" title={<T k="home.popular" />} action={{ label: <T k="home.seeAll" />, href: '/soeg/?sort=populaere' }} className={head} />
        <ProductGrid layout="responsive">
          {popular.map((it) => <ItemCard key={it.id} item={toCard(it)} />)}
        </ProductGrid>
      </section>

      <section aria-labelledby="maerker" className={`${container} mt-16`}>
        <SectionHeader id="maerker" title={<T k="home.brands" />} className={head} />
        <ul className="flex flex-wrap gap-2">
          {brands.map((b) => (
            <li key={b.brand}><Chip href={`/soeg/?q=${encodeURIComponent(b.brand)}`}>{b.brand}</Chip></li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="certificerede" className={`${container} mt-16`}>
        <SectionHeader id="certificerede" title={<T k="home.certified" />} description={<T k="home.certifiedDesc" />} className={head} />
        <ProductGrid layout="responsive">
          {certified.map((it) => <ItemCard key={it.id} item={toCard(it)} showSeller />)}
        </ProductGrid>
      </section>
    </>
  );
}
