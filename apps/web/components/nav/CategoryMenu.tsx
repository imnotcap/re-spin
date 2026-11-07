'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { Icon } from '@respin/ui';
import { CATEGORIES, type Category, type CategorySlug } from '../../lib/categories';
import type { MenuMeta } from '../../lib/catalog';
import { categoryImage } from '../../lib/images';
import { useI18n } from '../../lib/i18n/client';

const typeHref = (slug: string, sub?: string) => `/kategori/${slug}/${sub ? `?type=${encodeURIComponent(sub)}` : ''}`;
const OPEN_DELAY = 110;   // musen skal "hvile" et øjeblik, før menuen åbner (ingen blinken når man bare passerer)
const CLOSE_DELAY = 180;

/** Genveje med filtre, der allerede findes i kategorisidens URL */
const SHORTCUTS = [
  { key: 'sort.nyeste', icon: 'sparkle', q: '?sort=nyeste' },
  { key: 'sort.populaere', icon: 'heart', q: '?sort=populaere' },
  { key: 'price.under-200', icon: 'tag', q: '?pris=under-200' }
] as const;

/** Indholdet af megamenuen for én kategori: genveje | alle grupper som kolonner | fotokort med mærker */
function MegaPanel({ c, meta, onNavigate, id }: { c: Category; meta: MenuMeta[CategorySlug]; onNavigate: () => void; id: string }) {
  const { t, n } = useI18n();
  const cat = t(`cat.${c.slug}`, undefined, c.label);
  const img = categoryImage(c.slug);
  const cols = c.groups.length >= 3 ? 'grid-cols-3' : 'grid-cols-2';
  return (
    <div id={id} className="mx-auto grid max-w-7xl grid-cols-[210px_minmax(0,1fr)_280px] gap-8 px-6 py-7">
      {/* Genveje */}
      <ul className="flex flex-col gap-0.5 border-r border-line pr-6" aria-label={cat}>
        <li>
          <Link href={typeHref(c.slug)} onClick={onNavigate} className="flex items-center gap-3 rounded-md bg-sunken px-3 py-2.5 text-body font-semibold text-forest hover:bg-stone-100">
            <Icon name="grid" size={20} />{t('mega.all', { cat })}
          </Link>
        </li>
        {SHORTCUTS.map((x) => (
          <li key={x.key}>
            <Link href={`/kategori/${c.slug}/${x.q}`} onClick={onNavigate} className="flex items-center gap-3 rounded-md px-3 py-2.5 text-body font-semibold text-slate-700 hover:bg-sunken hover:text-ink">
              <Icon name={x.icon} size={20} className="text-muted" />{t(x.key)}
            </Link>
          </li>
        ))}
      </ul>

      {/* Alle grupper side om side */}
      <div className={`grid min-w-0 gap-8 ${cols}`}>
        {c.groups.map((g) => (
          <section key={g.label} aria-label={t(`group.${g.label}`, undefined, g.label)} className="min-w-0">
            <p className="flex items-center gap-2 text-caption font-bold uppercase tracking-[0.08em] text-muted">
              <Icon name={g.icon} size={16} className="text-forest" />{t(`group.${g.label}`, undefined, g.label)}
            </p>
            <ul className={`mt-2 ${g.items.length > 7 && c.groups.length < 3 ? 'columns-2 gap-x-6' : ''}`}>
              {g.items.map((s) => (
                <li key={s} className="break-inside-avoid">
                  <Link href={typeHref(c.slug, s)} onClick={onNavigate} className="block rounded-sm py-1.5 text-body text-ink underline-offset-4 hover:text-forest hover:underline">
                    {t(`sub.${s}`, undefined, s)}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      {/* Fotokort + populære mærker */}
      <div>
        <Link href={typeHref(c.slug)} onClick={onNavigate} className="group block overflow-hidden rounded-lg border border-line">
          <span className="block aspect-[16/10] overflow-hidden bg-stone-100">
            <img src={img.src} srcSet={img.srcSet} sizes="280px" alt="" width={280} height={175} loading="lazy" decoding="async"
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04] motion-reduce:transition-none" />
          </span>
          <span className="flex items-center justify-between gap-3 px-4 py-3">
            <span>
              <span className="block font-semibold">{t('mega.newIn', { cat })}</span>
              <span className="block text-small text-muted">{t('mega.items', { n: n(meta.count) })}</span>
            </span>
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-forest text-white transition-transform group-hover:translate-x-0.5"><Icon name="arrow" size={18} /></span>
          </span>
        </Link>
        {meta.brands.length > 0 && (
          <>
            <p className="mt-5 text-caption font-bold uppercase tracking-[0.08em] text-muted">{t('mega.brands')}</p>
            <ul className="mt-2 flex flex-wrap gap-1.5">
              {meta.brands.map((b) => (
                <li key={b}>
                  <Link href={`/soeg/?q=${encodeURIComponent(b)}`} onClick={onNavigate} className="inline-flex h-8 items-center rounded-pill border border-line px-3 text-small font-semibold hover:border-slate">{b}</Link>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}

/**
 * Kategorilinje. Desktop: megamenu (hover med lille forsinkelse, klik på pilen eller ↓ med tastatur).
 * Klik på selve kategorien går til kategorisiden. Mobil: vandret rulleliste – typerne findes i menuen (☰).
 */
export function CategoryNav({ meta }: { meta: MenuMeta }) {
  const pathname = usePathname();
  const { t } = useI18n();
  const [open, setOpen] = useState<CategorySlug | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const nav = useRef<HTMLElement>(null);
  const toggles = useRef<Partial<Record<CategorySlug, HTMLButtonElement | null>>>({});
  const panelId = useId();

  const schedule = useCallback((fn: () => void, ms: number) => { clearTimeout(timer.current); timer.current = setTimeout(fn, ms); }, []);
  const close = useCallback(() => { clearTimeout(timer.current); setOpen(null); }, []);
  useEffect(() => () => clearTimeout(timer.current), []);
  useEffect(() => { close(); }, [pathname, close]);

  // Escape lukker og giver fokus tilbage; fokus uden for menuen lukker
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { toggles.current[open]?.focus(); close(); } };
    const onFocus = (e: FocusEvent) => { if (!nav.current?.contains(e.target as Node)) close(); };
    document.addEventListener('keydown', onKey);
    document.addEventListener('focusin', onFocus);
    return () => { document.removeEventListener('keydown', onKey); document.removeEventListener('focusin', onFocus); };
  }, [open, close]);

  const current = open ? CATEGORIES.find((c) => c.slug === open) : undefined;

  return (
    <nav ref={nav} aria-label={t('menu.categories')} className="relative border-b border-line bg-surface"
      onMouseLeave={() => schedule(() => setOpen(null), CLOSE_DELAY)} onMouseEnter={() => clearTimeout(timer.current)}>
      <ul className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-2 [mask-image:linear-gradient(to_right,#000_85%,transparent)] [scrollbar-width:none] sm:px-4 md:[mask-image:none] lg:overflow-visible [&::-webkit-scrollbar]:hidden">
        {CATEGORIES.map((c) => {
          const href = `/kategori/${c.slug}/`;
          const active = pathname === href;
          const expanded = open === c.slug;
          const label = t(`cat.${c.slug}`, undefined, c.label);
          return (
            <li key={c.slug} className="flex shrink-0 items-center"
              onMouseEnter={() => { if (window.matchMedia('(min-width: 1024px) and (hover: hover)').matches) schedule(() => setOpen(c.slug), open ? 0 : OPEN_DELAY); }}>
              <Link
                href={href}
                aria-current={active ? 'page' : undefined}
                className={`relative flex h-11 items-center px-3 text-small font-semibold transition-colors hover:text-ink lg:pr-1 ${active || expanded ? 'text-ink' : 'text-slate-700'} ${active || expanded ? 'after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 after:rounded-full after:bg-ink lg:after:right-0' : ''}`}
              >
                {label}
              </Link>
              <button
                ref={(el) => { toggles.current[c.slug] = el; }}
                type="button"
                aria-expanded={expanded}
                aria-controls={expanded ? panelId : undefined}
                aria-label={t('mega.open', { cat: label })}
                onClick={() => (expanded ? close() : setOpen(c.slug))}
                onKeyDown={(e) => { if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(c.slug); requestAnimationFrame(() => document.getElementById(panelId)?.querySelector<HTMLElement>('a,button')?.focus()); } }}
                className="hidden h-11 w-6 items-center justify-center text-muted hover:text-ink lg:inline-flex"
              >
                <Icon name="down" size={14} className={`transition-transform ${expanded ? 'rotate-180' : ''}`} />
              </button>
            </li>
          );
        })}
      </ul>

      {current && (
        <div className="absolute inset-x-0 top-full z-30 hidden border-b border-line bg-surface shadow-float motion-safe:animate-[rs-mega-in_160ms_ease-out] lg:block">
          <MegaPanel c={current} meta={meta[current.slug]} onNavigate={close} id={panelId} />
        </div>
      )}
    </nav>
  );
}

/** Mobilmenuens kategorier: liste → tryk på en kategori → dens grupper og typer (med tilbage-knap). */
export function MobileCategories({ meta, onNavigate }: { meta: MenuMeta; onNavigate: () => void }) {
  const { t, n } = useI18n();
  const [slug, setSlug] = useState<CategorySlug | null>(null);
  const backRef = useRef<HTMLButtonElement>(null);
  const firstRef = useRef<HTMLButtonElement>(null);
  const c = slug ? CATEGORIES.find((x) => x.slug === slug) : undefined;
  useEffect(() => { if (c) backRef.current?.focus(); }, [c]);

  if (c) {
    const cat = t(`cat.${c.slug}`, undefined, c.label);
    return (
      <div>
        <button ref={backRef} type="button" onClick={() => { setSlug(null); requestAnimationFrame(() => firstRef.current?.focus()); }}
          className="flex items-center gap-2 rounded-md px-2 py-3 text-body font-semibold text-forest hover:bg-sunken">
          <Icon name="back" size={20} />{t('menu.back')}
        </button>
        <h2 className="px-2 pt-1 text-h3">{cat}</h2>
        <Link href={typeHref(c.slug)} onClick={onNavigate} className="mt-2 flex items-center justify-between rounded-md bg-sunken px-3 py-3 text-body font-semibold">
          <span className="flex items-center gap-3"><Icon name="grid" size={20} className="text-forest" />{t('mega.all', { cat })}</span>
          <span className="text-small font-normal text-muted">{t('mega.items', { n: n(meta[c.slug].count) })}</span>
        </Link>
        {c.groups.map((g) => (
          <section key={g.label} className="mt-4" aria-label={t(`group.${g.label}`, undefined, g.label)}>
            <p className="flex items-center gap-2 px-2 text-caption font-bold uppercase tracking-[0.08em] text-muted"><Icon name={g.icon} size={16} />{t(`group.${g.label}`, undefined, g.label)}</p>
            <ul className="mt-1 grid grid-cols-2 gap-x-2">
              {g.items.map((s) => (
                <li key={s}><Link href={typeHref(c.slug, s)} onClick={onNavigate} className="block rounded-md px-2 py-2.5 text-body hover:bg-sunken">{t(`sub.${s}`, undefined, s)}</Link></li>
              ))}
            </ul>
          </section>
        ))}
        {meta[c.slug].brands.length > 0 && (
          <>
            <p className="mt-4 px-2 text-caption font-bold uppercase tracking-[0.08em] text-muted">{t('mega.brands')}</p>
            <ul className="mt-2 flex flex-wrap gap-1.5 px-2">
              {meta[c.slug].brands.map((b) => (
                <li key={b}><Link href={`/soeg/?q=${encodeURIComponent(b)}`} onClick={onNavigate} className="inline-flex h-9 items-center rounded-pill border border-line px-3 text-small font-semibold">{b}</Link></li>
              ))}
            </ul>
          </>
        )}
      </div>
    );
  }

  return (
    <ul className="grid grid-cols-1 gap-1 sm:grid-cols-2">
      {CATEGORIES.map((x, i) => {
        const img = categoryImage(x.slug);
        return (
          <li key={x.slug}>
            <button ref={i === 0 ? firstRef : undefined} type="button" onClick={() => setSlug(x.slug)}
              className="flex w-full items-center gap-3 rounded-md px-2 py-2 text-left hover:bg-sunken">
              <img src={img.src} srcSet={img.srcSet} sizes="44px" alt="" width={44} height={44} loading="lazy" decoding="async" className="h-11 w-11 rounded-md object-cover" />
              <span className="flex-1">
                <span className="block text-body font-semibold">{t(`cat.${x.slug}`, undefined, x.label)}</span>
                <span className="block text-small text-muted">{t('mega.items', { n: n(meta[x.slug].count) })}</span>
              </span>
              <Icon name="next" size={20} className="text-muted" />
            </button>
          </li>
        );
      })}
    </ul>
  );
}
