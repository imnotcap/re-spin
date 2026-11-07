'use client';

import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { useI18n } from '../../lib/i18n/client';

export interface ProfileTab { id: string; label: ReactNode; count?: number; panel: ReactNode }

/**
 * Faner (WAI-ARIA tabs): piletaster flytter mellem fanerne, og #anmeldelser i adressen åbner den fane.
 * Uden JavaScript vises alle sektioner under hinanden (panelerne skjules først i browseren).
 */
export function ProfileTabs({ tabs }: { tabs: ProfileTab[] }) {
  const { t, n } = useI18n();
  const base = useId();
  const [active, setActive] = useState(tabs[0]!.id);
  const [ready, setReady] = useState(false);
  const refs = useRef<Array<HTMLButtonElement | null>>([]);

  useEffect(() => {
    const fromHash = () => { const h = decodeURIComponent(window.location.hash.slice(1)); if (tabs.some((x) => x.id === h)) setActive(h); };
    fromHash(); setReady(true);
    window.addEventListener('hashchange', fromHash);
    return () => window.removeEventListener('hashchange', fromHash);
  }, [tabs]);

  const select = (id: string, focus = false) => {
    setActive(id);
    history.replaceState(null, '', `${window.location.pathname}${window.location.search}#${id}`);
    if (focus) refs.current[tabs.findIndex((x) => x.id === id)]?.focus();
  };
  const onKey = (e: KeyboardEvent, i: number) => {
    const go = (j: number) => { e.preventDefault(); select(tabs[(j + tabs.length) % tabs.length]!.id, true); };
    if (e.key === 'ArrowRight') go(i + 1);
    else if (e.key === 'ArrowLeft') go(i - 1);
    else if (e.key === 'Home') go(0);
    else if (e.key === 'End') go(tabs.length - 1);
  };

  return (
    <div className="mt-8">
      <div role="tablist" aria-label={t('profile.tabs')} className="flex gap-1 overflow-x-auto border-b border-line [scrollbar-width:none]">
        {tabs.map((x, i) => {
          const on = x.id === active;
          return (
            <button key={x.id} ref={(el) => { refs.current[i] = el; }} id={`${base}-${x.id}-tab`} type="button" role="tab"
              aria-selected={on} aria-controls={`${base}-${x.id}`} tabIndex={on ? 0 : -1}
              onClick={() => select(x.id)} onKeyDown={(e) => onKey(e, i)}
              className={`relative shrink-0 px-4 py-3 text-body font-semibold transition-colors ${on ? 'text-ink after:absolute after:inset-x-3 after:-bottom-px after:h-0.5 after:rounded-full after:bg-ink' : 'text-muted hover:text-ink'}`}>
              {x.label}{x.count !== undefined && <span className="ml-1.5 font-normal text-muted">({n(x.count)})</span>}
            </button>
          );
        })}
      </div>
      {tabs.map((x) => (
        <div key={x.id} id={`${base}-${x.id}`} role="tabpanel" aria-labelledby={`${base}-${x.id}-tab`} tabIndex={0}
          hidden={ready && x.id !== active} className="pt-6 focus-visible:outline-offset-4">
          {x.panel}
        </div>
      ))}
    </div>
  );
}
