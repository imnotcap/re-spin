import Link from 'next/link';
import { Wordmark } from '@respin/ui';
import { NAV } from '../lib/site';

export function Footer() {
  return (
    <footer className="mt-24 bg-forest-900 text-cream">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-[1.5fr_1fr_1fr]">
        <div>
          <Wordmark size={26} color="var(--rs-cream)" />
          <p className="mt-4 max-w-sm text-small text-cream/75">Dansk markedsplads for brugt tøj, sko og boligting. Testversion – under udvikling.</p>
        </div>
        <nav aria-label="Sider">
          <h2 className="text-small font-bold text-lime">Sider</h2>
          <ul className="mt-3 space-y-2 text-small">
            {NAV.map((n) => <li key={n.href}><Link className="text-cream/85 hover:text-cream hover:underline" href={n.href}>{n.label}</Link></li>)}
          </ul>
        </nav>
        <div>
          <h2 className="text-small font-bold text-lime">Om siden</h2>
          <ul className="mt-3 space-y-2 text-small text-cream/85">
            <li>Ingen cookies og ingen sporing</li>
            <li>Skrifttype hostes af os selv</li>
            <li>
              Animationer:{' '}
              <a className="underline hover:text-cream" href="https://github.com/DavidHDev/react-bits" rel="noopener noreferrer" target="_blank">React Bits</a>
              {' '}(MIT + Commons Clause)
            </li>
          </ul>
        </div>
      </div>
      <p className="border-t border-cream/15 py-5 text-center text-caption text-cream/60">© 2026 re:spin</p>
    </footer>
  );
}
