import type { Metadata } from 'next';
import Link from 'next/link';
import { Breadcrumbs } from '@respin/ui';
import { T } from '../../lib/i18n/client';
import { allBrands } from '../../lib/catalog';

export const metadata: Metadata = {
  title: 'Mærker A–Å',
  description: 'Alle mærker på re:spin fra A til Å – find brugt tøj, sko, tasker og bolig fra dit yndlingsmærke.',
  alternates: { canonical: '/maerker/' }
};

/** Mærker grupperet efter forbogstav (A–Z, Æ, Ø, Å; tal og tegn under #) */
function byLetter() {
  const groups = new Map<string, { brand: string; count: number }[]>();
  for (const b of allBrands()) {
    const first = b.brand.trim().charAt(0).toLocaleUpperCase('da-DK');
    const letter = /\p{L}/u.test(first) ? first : '#';
    groups.set(letter, [...(groups.get(letter) ?? []), b]);
  }
  return [...groups].sort(([a], [b]) => (a === '#' ? 1 : b === '#' ? -1 : a.localeCompare(b, 'da')));
}

const anchor = (letter: string) => (letter === '#' ? 'andre' : `bogstav-${letter.toLowerCase()}`);

export default function BrandsPage() {
  const groups = byLetter();
  return (
    <div className="mx-auto max-w-7xl px-4 pt-5 pb-16 sm:px-6">
      <Breadcrumbs items={[{ label: <T k="crumb.home" />, href: '/' }, { label: <T k="nav.brandsAZ" /> }]} />
      <header className="mt-4 mb-6">
        <h1 className="text-h1 sm:text-[34px] sm:leading-[40px]"><T k="nav.brandsAZ" /></h1>
        <p className="mt-1 max-w-2xl text-body text-muted"><T k="brands.intro" /></p>
      </header>

      <nav aria-label="Gå til bogstav" className="sticky top-0 z-10 -mx-4 border-b border-line bg-surface/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
        <ul className="flex flex-wrap gap-1.5">
          {groups.map(([letter]) => (
            <li key={letter}>
              <a href={`#${anchor(letter)}`} className="inline-flex h-9 min-w-9 items-center justify-center rounded-md border border-line px-2 text-small font-semibold hover:border-ink">{letter}</a>
            </li>
          ))}
        </ul>
      </nav>

      <div className="mt-8 grid grid-cols-1 gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
        {groups.map(([letter, brands]) => (
          <section key={letter} id={anchor(letter)} aria-labelledby={`${anchor(letter)}-h`} className="scroll-mt-20">
            <h2 id={`${anchor(letter)}-h`} className="border-b border-line pb-2 text-h2">{letter}</h2>
            <ul className="mt-2">
              {brands.map((b) => (
                <li key={b.brand}>
                  <Link href={`/soeg/?q=${encodeURIComponent(b.brand)}`} className="flex items-center justify-between gap-3 py-1.5 text-body hover:text-forest">
                    <span className="truncate">{b.brand}</span>
                    <span className="font-mono text-caption tabular-nums text-muted" aria-hidden="true">{b.count}</span>
                    <span className="sr-only">{b.count === 1 ? <T k="browse.count1" /> : <T k="browse.countN" v={{ n: b.count }} />}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
