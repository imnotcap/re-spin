import { CategoryTile, Chip, HScroll, ProductGrid, SectionHeader, TrustBar } from '@respin/ui';
import { HomeHero } from '../components/home/HomeHero';
import { SellBanner } from '../components/home/SellBanner';
import { ItemCard } from '../components/ItemCard';
import { CATEGORIES, countIn, fromCertified, mostPopular, newest, popularBrands, toCard } from '../lib/catalog';
import { categoryImage } from '../lib/images';

const TRUST = [
  { icon: 'shield', title: 'Køberbeskyttelse på alle køb', href: '/sikkerhed/' },
  { icon: 'tag', title: '0 kr. at sætte til salg', href: '/gebyrer/' },
  { icon: 'eye', title: 'Hele prisen står på varen', href: '/gebyrer/' },
  { icon: 'truck', title: 'Fragt fra 39 kr.', href: '/saadan-virker-det/' }
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
      <HomeHero />

      <div className={`${container} mt-2 border-b border-line sm:mt-4`}>
        <TrustBar items={TRUST} variant="compact" />
      </div>

      <section aria-labelledby="kategorier" className={`${container} mt-10`}>
        <SectionHeader id="kategorier" title="Shop efter kategori" className={head} />
        {/* Mobil: vandret række. Fra tablet: gitter. */}
        <HScroll className="-mx-4 gap-3 px-4 sm:hidden">
          {CATEGORIES.map((c) => (
            <div key={c.slug} className="w-[116px] shrink-0">
              <CategoryTile variant="photo" icon={c.icon} label={c.label} href={`/kategori/${c.slug}/`} imageSrc={categoryImage(c.slug)} />
            </div>
          ))}
        </HScroll>
        <ul className="hidden gap-4 sm:grid sm:grid-cols-4 lg:grid-cols-8">
          {CATEGORIES.map((c) => (
            <li key={c.slug}>
              <CategoryTile variant="photo" icon={c.icon} label={c.label} count={countIn(c.slug)} href={`/kategori/${c.slug}/`} imageSrc={categoryImage(c.slug)} />
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="nyt" className={`${container} mt-14`}>
        <SectionHeader id="nyt" title="Nyt fra medlemmerne" action={{ label: 'Se alle', href: '/soeg/' }} className={head} />
        <ProductGrid layout="responsive">
          {latest.map((it) => <ItemCard key={it.id} item={toCard(it)} showSeller />)}
        </ProductGrid>
      </section>

      <SellBanner />

      <section aria-labelledby="populaere" className={`${container} mt-16`}>
        <SectionHeader id="populaere" title="Mest populære lige nu" action={{ label: 'Se alle', href: '/soeg/?sort=populaere' }} className={head} />
        <ProductGrid layout="responsive">
          {popular.map((it) => <ItemCard key={it.id} item={toCard(it)} />)}
        </ProductGrid>
      </section>

      <section aria-labelledby="maerker" className={`${container} mt-16`}>
        <SectionHeader id="maerker" title="Populære mærker" className={head} />
        <ul className="flex flex-wrap gap-2">
          {brands.map((b) => (
            <li key={b.brand}><Chip href={`/soeg/?q=${encodeURIComponent(b.brand)}`}>{b.brand}</Chip></li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="certificerede" className={`${container} mt-16`}>
        <SectionHeader id="certificerede" title="Fra certificerede sælgere" description="Bekræftet identitet og mange gode handler bag sig." className={head} />
        <ProductGrid layout="responsive">
          {certified.map((it) => <ItemCard key={it.id} item={toCard(it)} showSeller />)}
        </ProductGrid>
      </section>
    </>
  );
}
