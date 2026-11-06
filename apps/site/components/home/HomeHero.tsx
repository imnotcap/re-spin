import Link from 'next/link';
import { Button, Icon, ProductImage } from '@respin/ui';
import { formatKr } from '@respin/ui/utils';
import { LazyRotatingText } from '../LazyBits';
import type { Item } from '../../lib/catalog';

/** Kompakt kampagnebanner – produkterne skal hurtigt i syne. Udvalgte varer vises kun på store skærme. */
export function HomeHero({ picks }: { picks: readonly Item[] }) {
  return (
    <section aria-labelledby="hero-title" className="mx-auto max-w-7xl px-4 pt-5 sm:px-6 sm:pt-6">
      <div className="relative overflow-hidden rounded-xl bg-grad-deep text-cream">
        <div aria-hidden="true" className="pointer-events-none absolute -right-24 -top-32 h-96 w-96 rounded-full bg-lime opacity-25 blur-3xl" />
        <div className="relative flex items-center gap-10 px-5 py-7 sm:px-10 sm:py-9 lg:px-12">
          <div className="min-w-0 flex-1">
            {/* Overskriften er statisk HTML: vises med det samme (god LCP) og virker uden JS */}
            <h1 id="hero-title" className="text-[30px] font-extrabold leading-[34px] tracking-[-0.02em] sm:text-[42px] sm:leading-[46px]">
              Giv tøjet nyt liv.
            </h1>
            {/* Det skiftende ord står sidst på linjen: ordets bredde flytter ingen anden tekst (CLS 0) */}
            <p className="mt-2 text-[18px] font-semibold leading-[26px] text-cream/90 sm:text-[21px] sm:leading-[30px]">
              Find brugt{' '}
              <span className="font-extrabold text-lime"><LazyRotatingText texts={['tøj', 'sneakers', 'tasker', 'boligting', 'børnetøj']} /></span>
            </p>
            <p className="mt-2 max-w-lg text-small text-cream/80 sm:text-body">
              Fra folk i hele Danmark. Gratis at sætte til salg – og køberbeskyttelse på alle køb.
            </p>
            <div className="mt-5 flex flex-wrap gap-2 sm:gap-3">
              <Button href="/saelg/" icon="plus">Sælg nu</Button>
              <Button href="/saadan-virker-det/" variant="ghost-inverse">Sådan virker det</Button>
            </div>
          </div>
          <ul className="hidden shrink-0 gap-4 lg:flex" aria-label="Udvalgte varer">
            {picks.slice(0, 3).map((it, i) => (
              <li key={it.id} className="w-40">
                <Link href={`/vare/${it.id}/`} className="group block rounded-lg bg-surface p-2 text-ink shadow-float transition-transform duration-200 hover:-translate-y-1">
                  <div className="overflow-hidden rounded-md">
                    <ProductImage alt="" ratio="sq" shade={i}><Icon name={it.icon} size={48} /></ProductImage>
                  </div>
                  <span className="block truncate px-1 pt-2 text-small font-semibold group-hover:underline">{it.brand}</span>
                  <span className="block px-1 pb-0.5 text-small font-bold">{formatKr(it.price)}</span>
                  <span className="sr-only">{it.title}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
