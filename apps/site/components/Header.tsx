'use client';

import Link from 'next/link';
import { useEffect, useId, useRef, useState } from 'react';
import { Button, Icon, Wordmark } from '@respin/ui';
import { NAV, SITE } from '../lib/site';

export function Header() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const menuId = useId();
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Escape lukker menuen og giver fokus tilbage til knappen
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { setOpen(false); buttonRef.current?.focus(); } };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <header className={`sticky top-0 z-40 border-b transition-colors duration-200 ${scrolled || open ? 'border-line bg-canvas/95 backdrop-blur' : 'border-transparent bg-canvas'}`}>
      {SITE.isTest && (
        <p className="bg-slate px-4 py-1.5 text-center text-caption text-cream">
          Testversion – re:spin er under udvikling. Intet her er til salg endnu.
        </p>
      )}
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" aria-label="re:spin – forsiden" className="shrink-0" onClick={() => setOpen(false)}>
          <Wordmark size={24} color="var(--rs-forest)" onLight />
        </Link>
        <nav aria-label="Hovedmenu" className="hidden items-center gap-1 md:flex">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className="rounded-md px-3 py-2 text-small font-semibold text-slate-700 transition-colors hover:bg-sunken hover:text-ink">
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <Button href="/#demo" size="sm" className="hidden sm:inline-flex">Prøv demoen</Button>
          <button
            ref={buttonRef}
            type="button"
            className="inline-flex h-tap w-tap items-center justify-center rounded-md md:hidden"
            aria-expanded={open}
            aria-controls={menuId}
            aria-label={open ? 'Luk menu' : 'Åbn menu'}
            onClick={() => setOpen((v) => !v)}
          >
            <Icon name={open ? 'close' : 'grid'} size={24} />
          </button>
        </div>
      </div>
      <nav id={menuId} aria-label="Mobilmenu" hidden={!open} className="border-t border-line bg-canvas px-4 pb-4 md:hidden">
        <ul className="flex flex-col py-2">
          {NAV.map((n) => (
            <li key={n.href}>
              <Link href={n.href} className="block rounded-md px-2 py-3 text-body font-semibold" onClick={() => setOpen(false)}>{n.label}</Link>
            </li>
          ))}
        </ul>
        <Button href="/#demo" full onClick={() => setOpen(false)}>Prøv demoen</Button>
      </nav>
    </header>
  );
}
