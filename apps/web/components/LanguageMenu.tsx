'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { Icon } from '@respin/ui';
import { LOCALES, LOCALE_NAMES, type Locale } from '../lib/i18n';
import { setLocale, useI18n } from '../lib/i18n/client';

/**
 * Sprogvælger: knap med globus og sprognavn, der åbner en liste. Escape og klik udenfor lukker;
 * piletaster flytter mellem sprogene. `tone="dark"` til topbjælken, `tone="light"` til mobilmenuen.
 */
export function LanguageMenu({ tone = 'light', align = 'right' }: { tone?: 'dark' | 'light'; align?: 'left' | 'right' }) {
  const { locale, t } = useI18n();
  const [open, setOpen] = useState(false);
  const [announce, setAnnounce] = useState('');
  const id = useId();
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const items = useRef<Array<HTMLButtonElement | null>>([]);

  useEffect(() => {
    if (!open) return;
    items.current[LOCALES.indexOf(locale)]?.focus();
    const onDown = (e: PointerEvent) => { if (!root.current?.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { setOpen(false); button.current?.focus(); } };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('pointerdown', onDown); document.removeEventListener('keydown', onKey); };
  }, [open, locale]);

  const choose = (l: Locale) => {
    setOpen(false);
    button.current?.focus();
    if (l !== locale) { setLocale(l); setAnnounce(LOCALE_NAMES[l]); }
  };
  const onListKey = (e: React.KeyboardEvent) => {
    const i = items.current.findIndex((el) => el === document.activeElement);
    const go = (j: number) => { e.preventDefault(); items.current[(j + LOCALES.length) % LOCALES.length]?.focus(); };
    if (e.key === 'ArrowDown') go(i + 1);
    else if (e.key === 'ArrowUp') go(i - 1);
    else if (e.key === 'Home') go(0);
    else if (e.key === 'End') go(LOCALES.length - 1);
    else if (e.key === 'Tab') setOpen(false);
  };

  const dark = tone === 'dark';
  return (
    <div ref={root} className="relative">
      <button
        ref={button}
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((v) => !v)}
        className={`inline-flex items-center gap-1.5 rounded-sm px-1.5 py-0.5 font-semibold transition-colors ${dark ? 'text-cream/90 hover:text-cream' : 'h-11 border border-line px-3 text-ink hover:border-slate'}`}
      >
        <Icon name="globe" size={dark ? 16 : 20} />
        <span><span className="sr-only">{t('lang.label')}: </span>{LOCALE_NAMES[locale]}</span>
        <Icon name="down" size={dark ? 14 : 18} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      <ul
        id={id}
        hidden={!open}
        aria-label={t('lang.label')}
        onKeyDown={onListKey}
        className={`absolute z-50 mt-2 min-w-44 rounded-md border border-line bg-surface p-1 text-small text-ink shadow-float ${align === 'right' ? 'right-0' : 'left-0'}`}
      >
        {LOCALES.map((l, i) => (
          <li key={l}>
            <button
              ref={(el) => { items.current[i] = el; }}
              type="button"
              lang={l}
              aria-current={l === locale ? 'true' : undefined}
              onClick={() => choose(l)}
              className="flex w-full items-center justify-between gap-4 rounded-sm px-3 py-2.5 text-left font-semibold hover:bg-sunken focus-visible:bg-sunken"
            >
              {LOCALE_NAMES[l]}
              {l === locale && <Icon name="check" size={18} className="text-forest" />}
            </button>
          </li>
        ))}
      </ul>
      <span className="sr-only" role="status" aria-live="polite">{announce && t('lang.changed')}</span>
    </div>
  );
}
