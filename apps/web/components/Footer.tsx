import Link from 'next/link';
import { Wordmark } from '@respin/ui';
import { CATEGORIES } from '../lib/categories';
import { HELP_NAV, SITE } from '../lib/site';
import { T } from '../lib/i18n/client';

const linkCls = 'text-cream/85 underline-offset-4 hover:text-cream hover:underline';

export function Footer() {
  return (
    <footer className="mt-20 bg-forest-900 text-cream">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-10 px-4 py-14 sm:px-6 md:grid-cols-2 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)]">
        <div>
          <Wordmark size={26} color="var(--rs-cream)" />
          <p className="mt-4 max-w-xs text-small text-cream/80">
            <T k="footer.about" />
          </p>
          {SITE.isTest && <p className="mt-3 max-w-xs text-caption text-cream/65"><T k="footer.test" /></p>}
        </div>
        <nav aria-labelledby="footer-shop">
          <h2 id="footer-shop" className="text-small font-bold text-lime"><T k="footer.shop" /></h2>
          <ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-small md:grid-cols-1">
            {CATEGORIES.map((c) => <li key={c.slug}><Link className={linkCls} href={`/kategori/${c.slug}/`}><T k={`cat.${c.slug}`} /></Link></li>)}
          </ul>
        </nav>
        <nav aria-labelledby="footer-help">
          <h2 id="footer-help" className="text-small font-bold text-lime"><T k="footer.help" /></h2>
          <ul className="mt-3 space-y-2 text-small">
            {HELP_NAV.map((n) => <li key={n.href}><Link className={linkCls} href={n.href}><T k={n.key} /></Link></li>)}
          </ul>
        </nav>
        <nav aria-labelledby="footer-respin">
          <h2 id="footer-respin" className="text-small font-bold text-lime">{SITE.name}</h2>
          <ul className="mt-3 space-y-2 text-small">
            <li><Link className={linkCls} href="/saelg/"><T k="footer.sellOn" v={{ name: SITE.name }} /></Link></li>
            <li><Link className={linkCls} href="/favoritter/"><T k="footer.favorites" /></Link></li>
          </ul>
        </nav>
      </div>
      <div className="border-t border-cream/15">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-5 text-caption text-cream/65 sm:px-6">
          <p>© 2026 {SITE.name}</p>
          <Link className="underline-offset-4 hover:text-cream hover:underline" href="/licenser/"><T k="footer.licenses" /></Link>
        </div>
      </div>
    </footer>
  );
}
