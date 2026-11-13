'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Avatar, Button, Icon, LogoMark, Wordmark } from '@respin/ui';
import { HELP_NAV, SITE } from '../lib/site';
import { SearchBox } from './search/SearchBox';
import type { MenuMeta } from '../lib/catalog';
import { useFavorites } from '../lib/favorites';
import { NotificationBell } from './notify/NotificationBell';
import { refreshMe, useMe } from '../lib/me';
import { useI18n } from '../lib/i18n/client';
import { LanguageMenu } from './LanguageMenu';
import { MobileCategories } from './nav/CategoryMenu';
export { CategoryNav } from './nav/CategoryMenu';

const AUTH = process.env.NEXT_PUBLIC_AUTH_ENABLED === '1';

/** Hvem er logget ind. Hentes igen ved sideskift, fx efter log ind/ud (delt med varekortene, se lib/me.ts). */
function useMeOnNavigate(pathname: string) {
  useEffect(() => { refreshMe(); }, [pathname]);
  return useMe();
}

/** Konto-knap: samme størrelse logget ind og ud, så intet i headeren flytter sig. */
function AccountButton({ me, pathname }: { me: { name: string; avatar: string | null } | null; pathname: string }) {
  const { t } = useI18n();
  if (!AUTH) return null;
  const active = pathname.startsWith('/konto/') || pathname === '/log-ind/';
  return (
    <Link
      href={me ? '/konto/' : '/log-ind/'}
      aria-current={active ? 'page' : undefined}
      className="hidden h-tap w-tap items-center justify-center rounded-md text-ink transition-colors hover:bg-sunken md:inline-flex"
    >
      {me ? <Avatar name={me.name} src={me.avatar ?? undefined} size="sm" /> : <Icon name="user" size={22} />}
      <span className="sr-only">{me ? t('header.accountNamed', { name: me.name }) : t('header.login')}</span>
    </Link>
  );
}

export function Header({ meta }: { meta: MenuMeta }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const searchId = useId();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const pathname = usePathname();
  const { count } = useFavorites();
  const me = useMeOnNavigate(pathname);

  // Luk også menuen ved sideskift, der ikke kommer fra menuen (fx tilbage-knappen)
  useEffect(() => { setOpen(false); }, [pathname]);

  // Escape lukker menuen og giver fokus tilbage til knappen
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { setOpen(false); buttonRef.current?.focus(); } };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  // Populære mærker på tværs af kategorierne (vises i søgefeltet, før man skriver)
  const popular = useMemo(() => {
    const totals = new Map<string, number>();
    for (const c of Object.values(meta.cats)) for (const b of c.brands) totals.set(b.brand, (totals.get(b.brand) ?? 0) + b.count);
    return [...totals].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([b]) => b);
  }, [meta]);

  const favLabel = count > 0 ? t('header.favoritesCount', { n: count }) : t('header.favorites');

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-surface/95 backdrop-blur supports-[backdrop-filter]:bg-surface/90">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:px-6 lg:gap-6">
        <Link href="/" prefetch={false} aria-label={t('header.home', { name: SITE.name })} className="shrink-0">
          <span className="sm:hidden"><LogoMark size={30} onLight /></span>
          <span className="hidden sm:block"><Wordmark size={24} color="var(--rs-forest)" onLight /></span>
        </Link>

        <SearchBox id={searchId} popular={popular} className="min-w-0 flex-1 lg:max-w-2xl" />

        <div className="ml-auto flex shrink-0 items-center gap-1 sm:gap-2">
          {/* Favoritter står også på mobil (bundmenuen har Beskeder og Profil) */}
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
          {AUTH && me && <NotificationBell />}
          {AUTH && me && (
            <Link href="/konto/beskeder/" aria-current={pathname.startsWith('/konto/beskeder/') ? 'page' : undefined}
              className="relative hidden h-tap w-tap items-center justify-center rounded-md text-ink transition-colors hover:bg-sunken md:inline-flex">
              <span className="sr-only">{me.unread > 0 ? t('account.unread', { n: me.unread }) : t('bottom.messages')}</span>
              <Icon name="chat" size={22} />
              {me.unread > 0 && (
                <span aria-hidden="true" className="absolute right-1 top-1 min-w-[18px] rounded-pill bg-coral-600 px-1 text-center text-[11px] font-bold leading-[18px] text-white">{me.unread > 99 ? '99+' : me.unread}</span>
              )}
            </Link>
          )}
          <AccountButton me={me} pathname={pathname} />
          <Button href={AUTH ? '/saelg/ny/' : '/saelg/'} size="sm" icon="plus" className="hidden md:inline-flex" data-track="header_sell">{t('header.sell')}</Button>
          <button
            ref={buttonRef}
            type="button"
            className="inline-flex h-tap w-tap items-center justify-center rounded-md transition-colors hover:bg-sunken lg:hidden"
            aria-expanded={open}
            aria-controls={menuId}
            aria-label={open ? t('header.closeMenu') : t('header.openMenu')}
            onClick={() => setOpen((v) => !v)}
          >
            <Icon name={open ? 'close' : 'grid'} size={22} />
          </button>
        </div>
      </div>

      <nav id={menuId} aria-label={t('menu.label')} hidden={!open} className="max-h-[calc(100dvh-64px)] overflow-y-auto border-t border-line bg-surface lg:hidden">
        <div className="mx-auto max-w-7xl px-4 pb-24 pt-2 sm:px-6 md:pb-6">
          <h2 className="px-2 pt-3 text-caption font-bold uppercase tracking-[0.08em] text-muted">{t('menu.categories')}</h2>
          <div className="mt-1">
            {/* key: start altid på kategorilisten, når menuen åbnes */}
            <MobileCategories key={String(open)} meta={meta} onNavigate={() => setOpen(false)} />
          </div>
          <h2 className="mt-4 border-t border-line px-2 pt-4 text-caption font-bold uppercase tracking-[0.08em] text-muted">{t('menu.help')}</h2>
          <ul className="mt-1">
            {HELP_NAV.map((n) => (
              <li key={n.href}><Link href={n.href} onClick={() => setOpen(false)} className="block rounded-md px-2 py-3 text-body font-semibold hover:bg-sunken">{t(n.key)}</Link></li>
            ))}
          </ul>
          {AUTH && (
            <Link href={me ? '/konto/' : '/log-ind/'} onClick={() => setOpen(false)} className="mt-2 flex items-center gap-3 rounded-md border-t border-line px-2 pb-1 pt-4 text-body font-semibold hover:bg-sunken">
              <Icon name="user" size={20} className="text-muted" />{me ? t('header.account') : t('header.loginOrSignup')}
            </Link>
          )}
          <div className="mt-4 flex items-center justify-between gap-3 border-t border-line px-2 pt-4">
            <span className="text-caption font-bold uppercase tracking-[0.08em] text-muted">{t('lang.label')}</span>
            <LanguageMenu align="right" />
          </div>
          <Button href={AUTH ? '/saelg/ny/' : '/saelg/'} full icon="plus" className="mt-4 md:hidden" onClick={() => setOpen(false)}>{t('header.sell')}</Button>
        </div>
      </nav>
    </header>
  );
}
