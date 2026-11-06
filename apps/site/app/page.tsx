import { CategoryTile, Chip, HScroll, ProductGrid, SectionHeader, TrustBar } from '@respin/ui';
import { HomeHero } from '../components/home/HomeHero';
import { ItemCard } from '../components/ItemCard';
import { Reveal } from '../components/Reveal';
import { Cta } from '../components/sections/Cta';
import { CATEGORIES, countIn, fromCertified, getItem, mostPopular, newest, popularBrands, toCard, type Item } from '../lib/catalog';

const PICKS = ['4001-adidas-samba', '1001-ganni-uldjakke', '7001-ph5-lampe', '5002-ruskindstaske']
  .map((id) => getItem(id))
  .filter((x): x is Item => x !== undefined);

const TRUST = [
  { icon: 'shield', title: 'Køberbeskyttelse', text: 'Pengene holdes, til du har fået varen', href: '/sikkerhed/' },
  { icon: 'tag', title: '0 kr. at sætte til salg', text: 'Sælger betaler kun 1 % ved salg', href: '/gebyrer/' },
  { icon: 'eye', title: 'Ingen skjulte gebyrer', text: 'Prisen inkl. køberbeskyttelse står på hver vare', href: '/gebyrer/' },
  { icon: 'truck', title: 'Fragt fra 39 kr.', text: 'Send fra pakkeshop med det samme', href: '/saadan-virker-det/' }
] as const;

const container = 'mx-auto max-w-7xl px-4 sm:px-6';
const sectionGap = 'mt-14 sm:mt-16';
const head = 'px-0';

export default function HomePage() {
  // Hver liste viser nye varer – samme vare går ikke igen længere nede
  const latest = newest(12);
  const shown = new Set(latest.map((i) => i.id));
  const popular = mostPopular().filter((i) => !shown.has(i.id)).slice(0, 6);
  popular.forEach((i) => shown.add(i.id));
  const certified = fromCertified().filter((i) => !shown.has(i.id)).slice(0, 6);
  const brands = popularBrands(12);

  return (
    <>
      <HomeHero picks={PICKS} />

      <div className={`${container} mt-3`}>
        <TrustBar items={TRUST} variant="compact" />
      </div>

      <section aria-labelledby="kategorier" className={`${container} mt-8 sm:mt-12`}>
        <SectionHeader id="kategorier" title="Shop efter kategori" className={head} />
        {/* Mobil: runde genveje i en vandret række (som i appen). Fra tablet: kort med antal varer. */}
        <HScroll className="-mx-4 px-4 sm:hidden">
          {CATEGORIES.map((c) => <CategoryTile key={c.slug} icon={c.icon} label={c.label} href={`/kategori/${c.slug}/`} />)}
        </HScroll>
        <ul className="hidden gap-3 sm:grid sm:grid-cols-4 lg:grid-cols-8">
          {CATEGORIES.map((c) => (
            <li key={c.slug} className="grid"><CategoryTile variant="card" icon={c.icon} label={c.label} count={countIn(c.slug)} href={`/kategori/${c.slug}/`} /></li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="nyt" className={`${container} mt-10 sm:mt-14`}>
        <SectionHeader id="nyt" title="Nyt fra medlemmerne" description="De seneste varer, der er sat til salg." action={{ label: 'Se alle', href: '/soeg/' }} className={head} />
        <ProductGrid layout="responsive">
          {latest.map((it) => <ItemCard key={it.id} item={toCard(it)} showSeller />)}
        </ProductGrid>
      </section>

      <Reveal>
        <section aria-labelledby="maerker" className={`${container} ${sectionGap}`}>
          <SectionHeader id="maerker" title="Populære mærker" className={head} />
          <ul className="flex flex-wrap gap-2">
            {brands.map((b) => (
              <li key={b.brand}><Chip href={`/soeg/?q=${encodeURIComponent(b.brand)}`}>{b.brand}</Chip></li>
            ))}
          </ul>
        </section>
      </Reveal>

      <section aria-labelledby="populaere" className={`${container} ${sectionGap}`}>
        <SectionHeader id="populaere" title="Mest populære lige nu" description="Varer, som mange har gemt." className={head} />
        <ProductGrid layout="responsive">
          {popular.map((it) => <ItemCard key={it.id} item={toCard(it)} />)}
        </ProductGrid>
      </section>

      <section aria-labelledby="certificerede" className={`${container} ${sectionGap}`}>
        <SectionHeader id="certificerede" title="Fra certificerede sælgere" description="Bekræftet identitet og mange gode handler bag sig." className={head} />
        <ProductGrid layout="responsive">
          {certified.map((it) => <ItemCard key={it.id} item={toCard(it)} showSeller />)}
        </ProductGrid>
      </section>

      <Cta />
    </>
  );
}
