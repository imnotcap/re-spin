'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Icon, type IconName } from '@respin/ui';
import { useFavorites } from '../../lib/favorites';
import { useMe } from '../../lib/me';
import { useI18n } from '../../lib/i18n/client';
import type { MessageKey } from '../../lib/i18n';

const AUTH = process.env.NEXT_PUBLIC_AUTH_ENABLED === '1';

/** Sider med egen fast bjælke i bunden (købsbjælken på varesiden, skrivefeltet i en samtale) – der vises bundmenuen ikke */
const HIDE_ON = [/^\/vare\//, /^\/annonce\//, /^\/konto\/beskeder\/[0-9a-f-]{36}\//];

interface Tab { href: string; label: MessageKey; icon: IconName; active: (p: string) => boolean; sell?: boolean; track: string }

const TABS: Tab[] = [
  { href: '/', label: 'bottom.home', icon: 'home', track: 'nav_home', active: (p) => p === '/' },
  { href: '/soeg/', label: 'bottom.search', icon: 'search', track: 'nav_search', active: (p) => p.startsWith('/soeg/') || p.startsWith('/kategori/') },
  { href: AUTH ? '/saelg/ny/' : '/saelg/', label: 'bottom.sell', icon: 'plus', track: 'nav_sell', active: (p) => p.startsWith('/saelg/'), sell: true },
  // Med login: Beskeder i stedet for Favoritter (favoritterne ligger som hjerte i headeren), så "Sælg" bliver i midten
  ...(AUTH
    ? [
      { href: '/konto/beskeder/', label: 'bottom.messages' as MessageKey, icon: 'chat' as IconName, track: 'nav_messages', active: (p: string) => p.startsWith('/konto/beskeder/') },
      { href: '/konto/', label: 'bottom.account' as MessageKey, icon: 'user' as IconName, track: 'nav_account', active: (p: string) => (p.startsWith('/konto/') && !p.startsWith('/konto/beskeder/')) || p === '/log-ind/' || p === '/opret-konto/' }
    ]
    : [{ href: '/favoritter/', label: 'bottom.favorites' as MessageKey, icon: 'heart' as IconName, track: 'nav_favorites', active: (p: string) => p.startsWith('/favoritter/') }])
];

/**
 * Bundmenu på mobil (under 768 px): de vigtigste steder inden for tommelfingerens rækkevidde, med "Sælg" i midten.
 * Skjules, når tastaturet er fremme (et felt har fokus), så den ikke dækker det, man skriver i.
 */
export function BottomNav() {
  const pathname = usePathname();
  const { t } = useI18n();
  const { count } = useFavorites();
  const unread = useMe()?.unread ?? 0;
  const [typing, setTyping] = useState(false);

  useEffect(() => {
    const isField = (el: EventTarget | null) => el instanceof HTMLElement && el.matches('input:not([type=checkbox]):not([type=radio]), textarea, select, [contenteditable="true"]');
    const onIn = (e: FocusEvent) => setTyping(isField(e.target));
    const onOut = () => setTyping(false);
    document.addEventListener('focusin', onIn);
    document.addEventListener('focusout', onOut);
    return () => { document.removeEventListener('focusin', onIn); document.removeEventListener('focusout', onOut); };
  }, []);

  if (HIDE_ON.some((r) => r.test(pathname))) return null;

  return (
    <nav aria-label={t('bottom.label')} data-typing={typing || undefined}
      className="rs-bottomnav fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface md:hidden print:hidden data-[typing]:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <ul className="mx-auto grid h-16 max-w-md" style={{ gridTemplateColumns: `repeat(${TABS.length}, minmax(0, 1fr))` }}>
        {TABS.map((tab) => {
          const active = tab.active(pathname);
          return (
            <li key={tab.href}>
              <Link href={tab.href} aria-current={active ? 'page' : undefined} data-track={tab.track}
                className={`relative flex h-full flex-col items-center justify-center gap-0.5 text-[11px] leading-4 ${active ? 'font-bold text-forest' : 'font-medium text-slate-700'}`}>
                {tab.sell ? (
                  <span aria-hidden="true" className="inline-flex h-8 w-11 items-center justify-center rounded-pill bg-forest text-white"><Icon name="plus" size={20} /></span>
                ) : (
                  <span className="relative flex h-8 items-center">
                    <Icon name={tab.icon} size={22} />
                    {tab.icon === 'chat' && unread > 0 && (
                      <span className="absolute -right-2.5 top-0 min-w-[18px] rounded-pill bg-coral-600 px-1 text-center text-[10px] font-bold leading-[18px] text-white">
                        <span aria-hidden="true">{unread > 99 ? '99+' : unread}</span><span className="sr-only">{t('account.unread', { n: unread })}</span>
                      </span>
                    )}
                    {tab.icon === 'heart' && count > 0 && (
                      <span aria-hidden="true" className="absolute -right-2.5 top-0 min-w-[18px] rounded-pill bg-coral-600 px-1 text-center text-[10px] font-bold leading-[18px] text-white">{count > 99 ? '99+' : count}</span>
                    )}
                  </span>
                )}
                <span>{t(tab.label)}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
