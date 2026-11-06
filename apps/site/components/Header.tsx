'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { Button, Icon, LogoMark, Wordmark } from '@respin/ui';
import { BASE_PATH, HELP_NAV, SITE } from '../lib/site';
import { CATEGORIES } from '../lib/categories';
import { useFavorites } from '../lib/favorites';

/** Søgefelt. Uden JavaScript sendes formularen som almindelig GET til /soeg/?q=… (med base-stien). */
function SearchForm({ id, className = '' }: { id: string; className?: string }) {
  const router = useRouter();
  const ref = useRef<HTMLInputElement>(null);
  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const q = (ref.current?.value ?? '').trim();
    router.push(q ? `/soeg/?q=${encodeURIComponent(q)}` : '/soeg/');
    ref.current?.blur();
  };
  return (
    <form role="search" action={`${BASE_PATH}/soeg/`} method="get" onSubmit={onSubmit} className={`relative ${className}`}>
      <label htmlFor={id} className="sr-only">Søg efter varer og mærker</label>
      <Icon name="search" size={20} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
      <input
        ref={ref}
        id={id}
        name="q"
        type="search"
        enterKeyHint="search"
        autoComplete="off"
        placeholder="Søg efter varer"
        className="h-11 w-full rounded-md border border-stone-300 bg-surface pl-11 pr-4 text-body text-ink placeholder:text-muted transition-colors focus:border-slate focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest"
      />
    </form>
  );
}

export function Header() {
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const searchId = useId();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const pathname = usePathname();
  const { count } = useFavorites();

  // Luk også menuen ved sideskift, der ikke kommer fra menuen (fx tilbage-knappen)
  useEffect(() => { setOpen(false); }, [pathname]);

  // Escape lukker menuen og giver fokus tilbage til knappen
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { setOpen(false); buttonRef.current?.focus(); } };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  const favLabel = count > 0 ? `Favoritter, ${count} gemt` : 'Favoritter';

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-surface/95 backdrop-blur supports-[backdrop-filter]:bg-surface/90">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:px-6 lg:gap-6">
        <Link href="/" aria-label={`${SITE.name} – forsiden`} className="shrink-0">
          <span className="sm:hidden"><LogoMark size={30} onLight /></span>
          <span className="hidden sm:block"><Wordmark size={24} color="var(--rs-forest)" onLight /></span>
        </Link>

        <SearchForm id={searchId} className="min-w-0 flex-1 lg:max-w-2xl" />

        <div className="ml-auto flex shrink-0 items-center gap-1 sm:gap-2">
          <Link
            href="/favoritter/"
            aria-current={pathname === '/favoritter/' ? 'page' : undefined}
            className="relative inline-flex h-tap w-tap items-center justify-center rounded-md text-ink transition-colors hover:bg-sunken"
          >
            <span className="sr-only">{favLabel}</span>
            <Icon name="heart" size={22} />
            {count > 0 && (
              <span aria-hidden="true" className="absolute right-1 top-1 min-w-[18px] rounded-pill bg-coral-600 px-1 text-center text-[11px] font-bold leading-[18px] text-white">
                {count > 99 ? '99+' : count}
              </span>
            )}
          </Link>
          <Button href="/saelg/" size="sm" icon="plus" className="hidden sm:inline-flex">Sælg nu</Button>
          <button
            ref={buttonRef}
            type="button"
            className="inline-flex h-tap w-tap items-center justify-center rounded-md transition-colors hover:bg-sunken lg:hidden"
            aria-expanded={open}
            aria-controls={menuId}
            aria-label={open ? 'Luk menu' : 'Åbn menu'}
            onClick={() => setOpen((v) => !v)}
          >
            <Icon name={open ? 'close' : 'grid'} size={22} />
          </button>
        </div>
      </div>

      <nav id={menuId} aria-label="Menu" hidden={!open} className="max-h-[calc(100dvh-64px)] overflow-y-auto border-t border-line bg-surface lg:hidden">
        <div className="mx-auto max-w-7xl px-4 pb-6 pt-2 sm:px-6">
          <h2 className="px-2 pt-3 text-caption font-bold uppercase tracking-[0.08em] text-muted">Kategorier</h2>
          <ul className="mt-1 grid grid-cols-2 gap-x-2">
            {CATEGORIES.map((c) => (
              <li key={c.slug}>
                <Link href={`/kategori/${c.slug}/`} onClick={() => setOpen(false)} className="flex items-center gap-3 rounded-md px-2 py-3 text-body font-semibold hover:bg-sunken">
                  <Icon name={c.icon} size={20} className="text-muted" />{c.label}
                </Link>
              </li>
            ))}
          </ul>
          <h2 className="mt-4 border-t border-line px-2 pt-4 text-caption font-bold uppercase tracking-[0.08em] text-muted">Hjælp</h2>
          <ul className="mt-1">
            {HELP_NAV.map((n) => (
              <li key={n.href}><Link href={n.href} onClick={() => setOpen(false)} className="block rounded-md px-2 py-3 text-body font-semibold hover:bg-sunken">{n.label}</Link></li>
            ))}
          </ul>
          <Button href="/saelg/" full icon="plus" className="mt-4 sm:hidden" onClick={() => setOpen(false)}>Sælg nu</Button>
        </div>
      </nav>
    </header>
  );
}

/** Kategorilinje under headeren (ikke sticky). På mobil kan den scrolles vandret. */
export function CategoryNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Kategorier" className="border-b border-line bg-surface">
      <ul className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-2 [mask-image:linear-gradient(to_right,#000_85%,transparent)] [scrollbar-width:none] sm:px-4 md:[mask-image:none] [&::-webkit-scrollbar]:hidden">
        {CATEGORIES.map((c) => {
          const href = `/kategori/${c.slug}/`;
          const active = pathname === href;
          return (
            <li key={c.slug} className="shrink-0">
              <Link
                href={href}
                aria-current={active ? 'page' : undefined}
                className={`relative flex h-11 items-center px-3 text-small font-semibold transition-colors hover:text-ink ${active ? 'text-ink after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 after:rounded-full after:bg-ink' : 'text-slate-700'}`}
              >
                {c.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
