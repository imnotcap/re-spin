import Link from 'next/link';
import { HELP_NAV, SITE } from '../lib/site';
import { T } from '../lib/i18n/client';
import { LanguageMenu } from './LanguageMenu';

/** Smal bjælke øverst: besked om testversionen + hjælpelinks (fra tablet og op). Scroller væk. */
export function TopBar() {
  return (
    <section aria-label="Information" className="bg-slate text-cream">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-1.5 text-caption sm:px-6">
        <p className="min-w-0">
          <T k={SITE.isTest ? 'top.test' : 'top.protection'} />
        </p>
        <div className="flex shrink-0 items-center gap-5">
          <nav aria-label="Genveje" className="hidden md:block">
            <ul className="flex gap-5">
              {HELP_NAV.slice(0, 3).map((n) => <li key={n.href}><Link href={n.href} className="text-cream/85 underline-offset-4 hover:text-cream hover:underline"><T k={n.key} /></Link></li>)}
            </ul>
          </nav>
          <LanguageMenu tone="dark" />
        </div>
      </div>
    </section>
  );
}
