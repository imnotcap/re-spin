import Link from 'next/link';
import { Icon, Wordmark } from '@respin/ui';
import { CATEGORIES } from '../lib/categories';
import { HELP_NAV, LEGAL_NAV, SITE, SOCIAL } from '../lib/site';
import { T } from '../lib/i18n/client';

const linkCls = 'text-cream/85 underline-offset-4 hover:text-cream hover:underline';
const head = 'text-small font-bold text-lime';

export function Footer() {
  return (
    <footer className="mt-20 bg-forest-900 text-cream">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-10 px-4 py-14 sm:px-6 md:grid-cols-2 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)]">
        <div>
          <Wordmark size={26} color="var(--rs-cream)" />
          <p className="mt-4 max-w-xs text-small text-cream/80"><T k="footer.about" /></p>
          {SITE.isTest && <p className="mt-3 max-w-xs text-caption text-cream/65"><T k="footer.test" /></p>}
          <p className={`${head} mt-6`}><T k="footer.follow" /></p>
          <ul className="mt-3 flex flex-wrap gap-2">
            {SOCIAL.map((s) => (
              <li key={s.name}>
                <a href={s.href} rel="noopener noreferrer" target="_blank" aria-label={`${SITE.name} på ${s.name}`}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-cream/25 text-cream transition-colors hover:border-lime hover:text-lime">
                  <Icon name={s.icon} size={20} />
                </a>
              </li>
            ))}
          </ul>
        </div>
        <nav aria-labelledby="footer-shop">
          <h2 id="footer-shop" className={head}><T k="footer.shop" /></h2>
          <ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-small md:grid-cols-1">
            {CATEGORIES.map((c) => <li key={c.slug}><Link className={linkCls} href={`/kategori/${c.slug}/`}><T k={`cat.${c.slug}`} /></Link></li>)}
          </ul>
        </nav>
        <nav aria-labelledby="footer-help">
          <h2 id="footer-help" className={head}><T k="footer.help" /></h2>
          <ul className="mt-3 space-y-2 text-small">
            {HELP_NAV.map((n) => <li key={n.href}><Link className={linkCls} href={n.href}><T k={n.key} /></Link></li>)}
          </ul>
        </nav>
        <nav aria-labelledby="footer-respin">
          <h2 id="footer-respin" className={head}>{SITE.name}</h2>
          <ul className="mt-3 space-y-2 text-small">
            <li><Link className={linkCls} href="/om/"><T k="footer.platform" /></Link></li>
            <li><Link className={linkCls} href="/saelg/"><T k="footer.sellOn" v={{ name: SITE.name }} /></Link></li>
            <li><Link className={linkCls} href="/favoritter/"><T k="footer.favorites" /></Link></li>
          </ul>
        </nav>
      </div>
      <div className="border-t border-cream/15">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-5 text-caption text-cream/70 sm:px-6 md:flex-row md:items-center md:justify-between">
          <p>© 2026 {SITE.name}</p>
          <nav aria-label="Juridisk">
            <ul className="flex flex-wrap gap-x-5 gap-y-2">
              {LEGAL_NAV.map((n) => <li key={n.href}><Link className="underline-offset-4 hover:text-cream hover:underline" href={n.href}><T k={n.key} /></Link></li>)}
            </ul>
          </nav>
        </div>
      </div>
    </footer>
  );
}
