import Link from 'next/link';
import { HELP_NAV, SITE } from '../lib/site';

/** Smal bjælke øverst: besked om testversionen + hjælpelinks (fra tablet og op). Scroller væk. */
export function TopBar() {
  return (
    <section aria-label="Information" className="bg-slate text-cream">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-1.5 text-caption sm:px-6">
        <p className="min-w-0">
          {SITE.isTest ? <>Testversion – <span className="whitespace-nowrap">intet her er til salg endnu.</span></> : 'Køberbeskyttelse på alle køb'}
        </p>
        <nav aria-label="Genveje" className="hidden md:block">
          <ul className="flex gap-5">
            {HELP_NAV.slice(0, 3).map((n) => <li key={n.href}><Link href={n.href} className="text-cream/85 underline-offset-4 hover:text-cream hover:underline">{n.label}</Link></li>)}
          </ul>
        </nav>
      </div>
    </section>
  );
}
