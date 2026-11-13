'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useCallback, useEffect, useId, useMemo, useRef, useState, type FormEvent, type KeyboardEvent, type ReactNode } from 'react';
import { Avatar, Icon } from '@respin/ui';
import { formatKr } from '@respin/ui/utils';
import { BASE_PATH } from '../../lib/site';
import { useI18n } from '../../lib/i18n/client';
import { profilePath } from '../../lib/profile-url';
import type { Suggestions } from '../../lib/search-suggest';

/**
 * Søgefeltet i headeren.
 * - Forslag mens man skriver (varer, personer, mærker) fra /api/soeg/forslag/ – med pause mellem tasteslag og cache.
 * - På søgesiden opdateres resultaterne i stedet live, mens man skriver.
 * - Tomt felt: seneste søgninger (kun i denne browser) og populære mærker.
 * - Piletaster, Enter og Escape; "/" eller Ctrl/⌘+K hopper til feltet.
 * Uden JavaScript sendes formularen som almindelig GET til /soeg/?q=…
 */

const RECENT_KEY = 'videro:search:recent';
const RECENT_MAX = 6;
const SUGGEST_DELAY = 140;
const LIVE_DELAY = 350;

function readRecent(): string[] {
  try {
    const v: unknown = JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]');
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string').slice(0, RECENT_MAX) : [];
  } catch { return []; }
}
function writeRecent(list: string[]) {
  try { localStorage.setItem(RECENT_KEY, JSON.stringify(list)); } catch { /* privat vindue o.l. */ }
}

const searchHref = (q: string) => (q ? `/soeg/?q=${encodeURIComponent(q)}` : '/soeg/');
const term = (v: string) => v.trim().replace(/^@+/, '');

/** Den del af teksten, der matcher søgningen, står fremhævet */
function Highlight({ text, q }: { text: string; q: string }) {
  const needle = term(q).toLocaleLowerCase('da-DK');
  const at = needle ? text.toLocaleLowerCase('da-DK').indexOf(needle) : -1;
  if (at < 0) return <>{text}</>;
  return <>{text.slice(0, at)}<mark className="bg-transparent font-bold text-ink">{text.slice(at, at + needle.length)}</mark>{text.slice(at + needle.length)}</>;
}

type Option = { id: string; go: () => void };

export function SearchBox({ id, className = '', popular }: { id: string; className?: string; popular: readonly string[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const { t } = useI18n();
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const cache = useRef(new Map<string, Suggestions>());
  const typed = useRef(false);

  const [value, setValue] = useState('');
  const [open, setOpen] = useState(false);
  const [focused, setFocused] = useState(false);
  const [active, setActive] = useState(-1);
  const [data, setData] = useState<{ q: string; s: Suggestions } | null>(null);
  const [loading, setLoading] = useState(false);
  const [recent, setRecent] = useState<string[]>([]);

  const onSearchPage = pathname === '/soeg/';
  const q = value.trim();
  const live = term(q).length >= 2;

  // Feltet viser søgningen på søgesiden og er tomt alle andre steder
  useEffect(() => {
    typed.current = false;
    setValue(onSearchPage ? (new URLSearchParams(window.location.search).get('q') ?? '') : '');
    setOpen(false);
  }, [pathname, onSearchPage]);

  useEffect(() => { setRecent(readRecent()); }, []);

  // "/" og Ctrl/⌘+K: hop til søgefeltet
  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      const typing = !!el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName));
      if ((e.key === '/' && !typing && !e.metaKey && !e.ctrlKey && !e.altKey) || (e.key.toLowerCase() === 'k' && (e.metaKey || e.ctrlKey))) {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  // Klik udenfor lukker forslagene
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => { if (!formRef.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('pointerdown', onDown);
    return () => document.removeEventListener('pointerdown', onDown);
  }, [open]);

  // Forslag, mens man skriver (ikke på søgesiden – dér opdateres selve resultaterne)
  useEffect(() => {
    if (!open || onSearchPage || !live) { setLoading(false); return; }
    const hit = cache.current.get(q.toLocaleLowerCase('da-DK'));
    if (hit) { setData({ q, s: hit }); setLoading(false); return; }
    const ctrl = new AbortController();
    setLoading(true);
    const timer = window.setTimeout(() => {
      fetch(`${BASE_PATH}/api/soeg/forslag/?q=${encodeURIComponent(q)}`, { signal: ctrl.signal })
        .then((r) => (r.ok ? (r.json() as Promise<Suggestions>) : null))
        .then((s) => {
          if (!s || !Array.isArray(s.listings) || !Array.isArray(s.people) || !Array.isArray(s.brands)) return;
          if (cache.current.size > 60) cache.current.clear();
          cache.current.set(q.toLocaleLowerCase('da-DK'), s);
          setData({ q, s });
        })
        .catch(() => undefined)
        .finally(() => { if (!ctrl.signal.aborted) setLoading(false); });
    }, SUGGEST_DELAY);
    return () => { window.clearTimeout(timer); ctrl.abort(); };
  }, [q, open, onSearchPage, live]);

  // Live-opdatering af søgesiden
  useEffect(() => {
    if (!onSearchPage || !typed.current) return;
    const current = new URLSearchParams(window.location.search).get('q') ?? '';
    if (current.trim() === q) return;
    const timer = window.setTimeout(() => router.replace(searchHref(q), { scroll: false }), LIVE_DELAY);
    return () => window.clearTimeout(timer);
  }, [q, onSearchPage, router]);

  useEffect(() => { setActive(-1); }, [q, open]);

  const remember = useCallback((s: string) => {
    const v = s.trim();
    if (!v) return;
    const next = [v, ...readRecent().filter((x) => x.toLocaleLowerCase('da-DK') !== v.toLocaleLowerCase('da-DK'))].slice(0, RECENT_MAX);
    writeRecent(next);
    setRecent(next);
  }, []);
  const forget = (s: string) => { const next = readRecent().filter((x) => x !== s); writeRecent(next); setRecent(next); };
  const clearRecent = () => { writeRecent([]); setRecent([]); };

  const search = useCallback((s: string) => {
    const v = s.trim();
    remember(v);
    typed.current = false;
    setValue(v);
    setOpen(false);
    inputRef.current?.blur();
    router.push(searchHref(v));
  }, [remember, router]);
  const goTo = useCallback((href: string) => { remember(q); setOpen(false); inputRef.current?.blur(); router.push(href); }, [q, remember, router]);

  const s = data && data.q === q ? data.s : null;
  const showSuggestions = live && !onSearchPage;
  const showStart = !q && (recent.length > 0 || popular.length > 0);

  // Alle valgmuligheder i rækkefølge (til piletasterne)
  const options = useMemo<Option[]>(() => {
    if (showSuggestions) {
      return [
        { id: 'q', go: () => search(q) },
        ...(s?.listings ?? []).map((l) => ({ id: `l-${l.id}`, go: () => goTo(`/annonce/${l.id}/`) })),
        ...(s?.people ?? []).map((p) => ({ id: `p-${p.username}`, go: () => goTo(profilePath(p.username)) })),
        ...(s?.brands ?? []).map((b) => ({ id: `b-${b.brand}`, go: () => search(b.brand) }))
      ];
    }
    if (!q) return [...recent.map((r) => ({ id: `r-${r}`, go: () => search(r) })), ...popular.map((b) => ({ id: `pop-${b}`, go: () => search(b) }))];
    return [];
  }, [showSuggestions, s, q, recent, popular, search, goTo]);
  const optId = (oid: string) => `${listId}-${oid.replace(/[^\w-]/g, '_')}`;
  const indexOf = (oid: string) => options.findIndex((o) => o.id === oid);
  const panel = open && (showSuggestions || showStart);

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const o = options[active];
    if (panel && o) o.go(); else search(q);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      if (open) { e.preventDefault(); setOpen(false); } else if (value) { e.preventDefault(); setValue(''); typed.current = true; }
      return;
    }
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    e.preventDefault();
    if (!open) { setOpen(true); return; }
    if (!options.length) return;
    // -1 = selve feltet; piletasterne går rundt: felt → rækker → felt
    setActive((i) => (e.key === 'ArrowDown' ? (i + 1 >= options.length ? -1 : i + 1) : (i < 0 ? options.length - 1 : i - 1)));
  };

  // Hold den aktive række synlig
  useEffect(() => {
    if (active < 0 || !options[active]) return;
    document.getElementById(optId(options[active].id))?.scrollIntoView({ block: 'nearest' });
  });

  const row = (oid: string, children: ReactNode, opts: { href?: string; onClick: () => void; className?: string }) => {
    const i = indexOf(oid);
    const cls = `flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition-colors ${i === active ? 'bg-sunken' : 'hover:bg-sunken'} ${opts.className ?? ''}`;
    const common = { id: optId(oid), role: 'option' as const, 'aria-selected': i === active, onMouseEnter: () => setActive(i) };
    return opts.href
      ? <Link key={oid} href={opts.href} prefetch={false} {...common} className={cls} onClick={(e) => { e.preventDefault(); opts.onClick(); }}>{children}</Link>
      : <button key={oid} type="button" {...common} className={cls} onClick={opts.onClick}>{children}</button>;
  };

  const heading = (text: string, extra?: ReactNode) => (
    <div className="flex items-center justify-between px-3 pb-1 pt-3 text-caption font-bold uppercase tracking-[0.08em] text-muted">
      <span>{text}</span>{extra}
    </div>
  );

  return (
    <form ref={formRef} role="search" action={`${BASE_PATH}/soeg/`} method="get" onSubmit={onSubmit} className={`relative ${className}`}>
      <label htmlFor={id} className="sr-only">{t('header.searchLabel')}</label>
      <div className={`flex h-11 items-center gap-2 rounded-full pl-4 pr-1.5 transition-[background-color,box-shadow] duration-200 ${
        focused ? 'bg-surface shadow-[0_0_0_1.5px_var(--rs-forest),0_8px_28px_-10px_rgba(16,48,32,0.35)]' : 'bg-sunken shadow-[inset_0_0_0_1px_rgba(0,0,0,0.04)] hover:bg-stone-200/70'
      }`}>
        <Icon name="search" size={19} className={`shrink-0 transition-colors ${focused ? 'text-forest' : 'text-muted'}`} />
        <input
          ref={inputRef}
          id={id}
          name="q"
          type="search"
          role="combobox"
          aria-expanded={panel}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={panel && options[active] ? optId(options[active].id) : undefined}
          enterKeyHint="search"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="none"
          spellCheck={false}
          maxLength={100}
          value={value}
          placeholder={t('header.searchPlaceholder')}
          onChange={(e) => { typed.current = true; setValue(e.target.value); setOpen(true); }}
          onFocus={() => { setFocused(true); setOpen(true); }}
          onBlur={() => setFocused(false)}
          onKeyDown={onKeyDown}
          className="h-full min-w-0 flex-1 bg-transparent text-body text-ink outline-none placeholder:text-muted"
        />
        {loading && <span aria-hidden="true" className="size-4 shrink-0 animate-spin rounded-full border-2 border-stone-300 border-t-forest" />}
        {value ? (
          <button type="button" aria-label={t('search.clear')}
            onClick={() => { typed.current = true; setValue(''); setOpen(true); inputRef.current?.focus(); }}
            className="grid size-8 shrink-0 place-items-center rounded-full text-muted transition-colors hover:bg-stone-200 hover:text-ink">
            <Icon name="close" size={16} />
          </button>
        ) : (
          <kbd aria-hidden="true" className={`mr-1.5 hidden h-6 min-w-6 place-items-center rounded-md border border-line bg-surface px-1.5 font-sans text-caption text-muted lg:grid ${focused ? 'lg:hidden' : ''}`}>/</kbd>
        )}
      </div>

      {panel && (
        <div id={listId} role="listbox" aria-label={t('header.searchLabel')}
          className="fixed inset-x-0 top-16 z-50 max-h-[calc(100dvh-4rem)] overflow-y-auto border-b border-line bg-surface p-2 pb-4 shadow-[0_24px_48px_-20px_rgba(16,48,32,0.35)] [animation:rs-mega-in_.16s_ease-out] sm:absolute sm:inset-x-0 sm:top-[calc(100%+8px)] sm:max-h-[min(70vh,560px)] sm:rounded-2xl sm:border sm:pb-2">

          {showSuggestions && (
            <>
              {row('q', (
                <>
                  <span className="grid size-9 shrink-0 place-items-center rounded-full bg-forest/10 text-forest"><Icon name="search" size={17} /></span>
                  <span className="min-w-0 flex-1 truncate font-semibold">{t('search.searchFor', { q })}</span>
                  <span className="hidden text-caption text-muted sm:inline">{t('search.enter')} ↵</span>
                </>
              ), { href: searchHref(q), onClick: () => search(q) })}

              {s && s.listings.length > 0 && (
                <div role="group" aria-label={t('search.items')}>
                  {heading(t('search.items'))}
                  {s.listings.map((l) => row(`l-${l.id}`, (
                    <>
                      <span className="size-11 shrink-0 overflow-hidden rounded-lg bg-sunken">
                        {l.image && <img src={l.image} alt="" loading="lazy" decoding="async" className="size-full object-cover" />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-slate-700"><Highlight text={l.title} q={q} /></span>
                        {l.brand && <span className="block truncate text-caption text-muted"><Highlight text={l.brand} q={q} /></span>}
                      </span>
                      <span className="shrink-0 font-semibold tabular-nums">{formatKr(l.price)}</span>
                    </>
                  ), { href: `/annonce/${l.id}/`, onClick: () => goTo(`/annonce/${l.id}/`) }))}
                </div>
              )}

              {s && s.people.length > 0 && (
                <div role="group" aria-label={t('search.people')}>
                  {heading(t('search.people'))}
                  {s.people.map((p) => row(`p-${p.username}`, (
                    <>
                      <Avatar name={p.name} src={p.avatar ?? undefined} size="sm" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-slate-700"><Highlight text={p.name} q={q} /></span>
                        <span className="block truncate text-caption text-muted">@<Highlight text={p.username} q={q} /> · {t('search.forSale', { n: p.forSale })}</span>
                      </span>
                    </>
                  ), { href: profilePath(p.username), onClick: () => goTo(profilePath(p.username)) }))}
                </div>
              )}

              {s && s.brands.length > 0 && (
                <div role="group" aria-label={t('search.brands')}>
                  {heading(t('search.brands'))}
                  {s.brands.map((b) => row(`b-${b.brand}`, (
                    <>
                      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-sunken text-slate-700"><Icon name="tag" size={17} /></span>
                      <span className="min-w-0 flex-1 truncate text-slate-700"><Highlight text={b.brand} q={q} /></span>
                      <span className="shrink-0 text-caption text-muted">{b.count}</span>
                    </>
                  ), { href: searchHref(b.brand), onClick: () => search(b.brand) }))}
                </div>
              )}

              {s && !s.listings.length && !s.people.length && !s.brands.length && (
                <p className="px-3 py-3 text-small text-muted">{t('search.none')}</p>
              )}
            </>
          )}

          {showStart && (
            <>
              {recent.length > 0 && (
                <div role="group" aria-label={t('search.recent')}>
                  {heading(t('search.recent'), (
                    <button type="button" onClick={clearRecent} className="rounded px-1 text-caption font-semibold normal-case tracking-normal text-forest hover:underline">{t('search.clearRecent')}</button>
                  ))}
                  {recent.map((r) => (
                    <div key={r} className="group/r relative">
                      {row(`r-${r}`, (
                        <>
                          <Icon name="clock" size={18} className="shrink-0 text-muted" />
                          <span className="min-w-0 flex-1 truncate pr-8 text-slate-700">{r}</span>
                        </>
                      ), { href: searchHref(r), onClick: () => search(r) })}
                      <button type="button" aria-label={t('search.removeRecent', { q: r })} onClick={() => forget(r)}
                        className="absolute right-2 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-full text-muted opacity-60 transition hover:bg-stone-200 hover:text-ink hover:opacity-100 group-hover/r:opacity-100">
                        <Icon name="close" size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {popular.length > 0 && (
                <div role="group" aria-label={t('search.popular')}>
                  {heading(t('search.popular'))}
                  <div className="flex flex-wrap gap-2 px-3 pb-2 pt-1">
                    {popular.map((b) => {
                      const i = indexOf(`pop-${b}`);
                      return (
                        <Link key={b} id={optId(`pop-${b}`)} role="option" aria-selected={i === active} href={searchHref(b)} prefetch={false}
                          onMouseEnter={() => setActive(i)} onClick={(e) => { e.preventDefault(); search(b); }}
                          className={`rounded-full border px-3 py-1.5 text-small font-semibold transition-colors ${i === active ? 'border-forest bg-forest/5 text-forest' : 'border-line text-slate-700 hover:border-slate'}`}>
                          {b}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              )}
              <p className="flex items-center gap-2 px-3 pb-1 pt-2 text-caption text-muted"><Icon name="user" size={14} />{t('search.tip')}</p>
            </>
          )}
        </div>
      )}
    </form>
  );
}
