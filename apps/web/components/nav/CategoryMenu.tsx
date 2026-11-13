'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { Icon } from '@respin/ui';
import { CATEGORIES, type Category, type CategorySlug } from '../../lib/categories';
import type { MenuCategory, MenuMeta } from '../../lib/catalog';
import { categoryImage } from '../../lib/images';
import { useI18n } from '../../lib/i18n/client';

const typeHref = (slug: string, sub?: string) => `/kategori/${slug}/${sub ? `?type=${encodeURIComponent(sub)}` : ''}`;
const groupHref = (slug: string, group: string) => `/kategori/${slug}/?gruppe=${encodeURIComponent(group)}`;
const OPEN_DELAY = 110;   // musen skal "hvile" et øjeblik, før menuen åbner (ingen blinken når man bare passerer)
const CLOSE_DELAY = 180;

const catHref = (slug: string, q = '') => `/kategori/${slug}/${q}`;
/** Underkategorier pr. gruppe i drop-downen – resten nås via "Alle …" */
const PER_GROUP = 6;

/**
 * Indholdet af drop-downen for én kategori (kompakt): genveje som knapper øverst, én kolonne pr. gruppe
 * (Tøj, Sko, Tasker …) med de vigtigste typer og "Alle …", og populære mærker nederst.
 */
function MegaPanel({ c, meta, onNavigate, id }: { c: Category; meta: MenuCategory; onNavigate: () => void; id: string }) {
  const { t, n } = useI18n();
  const cat = t(`cat.${c.slug}`, undefined, c.label);
  const chipBase = 'inline-flex h-9 items-center gap-1.5 whitespace-nowrap rounded-pill border px-3.5 text-small font-semibold transition-colors';
  const chip = `${chipBase} border-line bg-surface text-ink hover:border-slate`;
  const num = 'font-normal tabular-nums text-muted';
  const shortcuts = [
    { href: catHref(c.slug, '?sort=nyeste'), label: t('mega.news'), extra: meta.newWeek > 0 ? <><span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-forest" /><span className={num}>+{n(meta.newWeek)}</span></> : null },
    { href: catHref(c.slug, '?sort=populaere'), label: t('mega.popular'), extra: null },
    meta.likeNew > 0 ? { href: catHref(c.slug, `?stand=${encodeURIComponent('Ny med mærke')}`), label: t('cond.Ny med mærke', undefined, 'Ny med mærke'), extra: <span className={num}>{n(meta.likeNew)}</span> } : null,
    meta.under200 > 0 ? { href: catHref(c.slug, '?pris=under-200'), label: t('price.under-200', undefined, 'Under 200 kr.'), extra: <span className={num}>{n(meta.under200)}</span> } : null
  ].filter((x) => x !== null);
  const cols = Math.min(c.groups.length, 5);

  return (
    <div id={id} className="mx-auto max-w-7xl px-8 pb-6 pt-5">
      <ul className="flex flex-wrap items-center gap-2">
        <li>
          <Link href={catHref(c.slug)} onClick={onNavigate} className={`${chipBase} border-forest bg-forest text-white hover:bg-forest-700`}>
            {t('mega.allIn', { cat })}<span className="font-normal tabular-nums text-lime">{n(meta.count)}</span>
          </Link>
        </li>
        {shortcuts.map((r) => <li key={r.href}><Link href={r.href} onClick={onNavigate} className={chip}>{r.label}{r.extra}</Link></li>)}
      </ul>

      <div className="mt-5 grid gap-x-8 gap-y-6" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
        {c.groups.map((g) => {
          const label = t(`group.${g.label}`, undefined, g.label);
          return (
            <section key={g.label} aria-label={label} className="min-w-0">
              <Link href={groupHref(c.slug, g.label)} onClick={onNavigate} data-track="mega_group" data-category={c.slug}
                className="block text-caption font-bold uppercase tracking-[0.08em] text-ink hover:text-forest">{label}</Link>
              <ul className="mt-2">
                {g.items.slice(0, PER_GROUP).map((x) => (
                  <li key={x}>
                    <Link href={typeHref(c.slug, x)} onClick={onNavigate} data-track="mega_sub" data-category={c.slug}
                      className="block truncate py-1 text-small text-slate-700 underline-offset-4 hover:text-forest hover:underline">{t(`sub.${x}`, undefined, x)}</Link>
                  </li>
                ))}
              </ul>
              <Link href={groupHref(c.slug, g.label)} onClick={onNavigate} className="mt-1 inline-flex items-center gap-1 text-small font-semibold text-forest hover:underline">
                {t('mega.allOf', { group: label.toLowerCase() })}<Icon name="arrow" size={14} />
              </Link>
            </section>
          );
        })}
      </div>

      {meta.brands.length > 0 && (
        <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-line pt-4">
          <span className="mr-1 text-small text-muted">{t('mega.brands')}:</span>
          {meta.brands.slice(0, 6).map((b) => (
            <Link key={b.brand} href={catHref(c.slug, `?maerke=${encodeURIComponent(b.brand)}`)} onClick={onNavigate} className={`${chip} h-8 font-medium`}>{b.brand}</Link>
          ))}
          <Link href="/maerker/" onClick={onNavigate} className="ml-1 inline-flex items-center gap-1 text-small font-semibold text-forest hover:underline">{t('nav.brandsAZ')}<Icon name="arrow" size={14} /></Link>
        </div>
      )}
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
    <nav ref={nav} aria-label={t('menu.categories')} data-chrome className="relative border-b border-line bg-surface"
      onMouseLeave={() => schedule(() => setOpen(null), CLOSE_DELAY)} onMouseEnter={() => clearTimeout(timer.current)}>
      <div className="mx-auto flex max-w-7xl items-center">
      <ul className="flex min-w-0 flex-1 gap-1 overflow-x-auto px-2 [mask-image:linear-gradient(to_right,#000_85%,transparent)] [scrollbar-width:none] sm:px-4 md:[mask-image:none] lg:gap-2 lg:overflow-visible lg:px-3 [&::-webkit-scrollbar]:hidden">
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
                data-track="mega_category" data-category={c.slug}
                aria-current={active ? 'page' : undefined}
                className={`relative flex h-11 items-center px-3 text-small font-semibold transition-colors hover:text-ink lg:h-[52px] lg:px-4 lg:text-body lg:font-medium ${active || expanded ? 'text-ink' : 'text-slate-700'} ${active || expanded ? 'after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 after:rounded-full after:bg-forest lg:after:inset-x-4' : ''}`}
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
                className="hidden h-11 w-6 items-center justify-center text-muted hover:text-ink lg:inline-flex lg:sr-only lg:focus-visible:not-sr-only"
              >
                <Icon name="down" size={14} className={`transition-transform ${expanded ? 'rotate-180' : ''}`} />
              </button>
            </li>
          );
        })}
      </ul>
      <ul className="hidden shrink-0 items-center gap-6 pr-6 text-small lg:flex">
        <li>
          <Link href="/soeg/?q=vintage" className="inline-flex items-center gap-2 text-slate-700 hover:text-ink">
            <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-coral-600" />{t('nav.vintage')}
          </Link>
        </li>
        <li><Link href="/maerker/" aria-current={pathname === '/maerker/' ? 'page' : undefined} className={pathname === '/maerker/' ? 'font-semibold text-ink' : 'text-slate-700 hover:text-ink'}>{t('nav.brandsAZ')}</Link></li>
      </ul>
      </div>

      {current && (
        <div className="absolute inset-x-0 top-full z-30 hidden border-b border-line bg-surface shadow-float motion-safe:animate-[rs-mega-in_160ms_ease-out] lg:block">
          <MegaPanel c={current} meta={meta.cats[current.slug]} onNavigate={close} id={panelId} />
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
          <span className="text-small font-normal text-muted">{t('mega.items', { n: n(meta.cats[c.slug].count) })}</span>
        </Link>
        {c.groups.map((g) => (
          <section key={g.label} className="mt-4" aria-label={t(`group.${g.label}`, undefined, g.label)}>
            <Link href={groupHref(c.slug, g.label)} onClick={onNavigate} className="flex items-center gap-2 rounded-md px-2 py-1 text-caption font-bold uppercase tracking-[0.08em] text-muted hover:text-ink"><Icon name={g.icon} size={16} />{t(`group.${g.label}`, undefined, g.label)}<Icon name="next" size={14} className="ml-auto" /></Link>
            <ul className="mt-1 grid grid-cols-2 gap-x-2">
              {g.items.map((s) => (
                <li key={s}><Link href={typeHref(c.slug, s)} onClick={onNavigate} className="block rounded-md px-2 py-2.5 text-body hover:bg-sunken">{t(`sub.${s}`, undefined, s)}</Link></li>
              ))}
            </ul>
          </section>
        ))}
        {meta.cats[c.slug].brands.length > 0 && (
          <>
            <p className="mt-4 px-2 text-caption font-bold uppercase tracking-[0.08em] text-muted">{t('mega.brands')}</p>
            <ul className="mt-2 flex flex-wrap gap-1.5 px-2">
              {meta.cats[c.slug].brands.map(({ brand: b }) => (
                <li key={b}><Link href={catHref(c.slug, `?maerke=${encodeURIComponent(b)}`)} onClick={onNavigate} className="inline-flex h-9 items-center rounded-pill border border-line px-3 text-small font-semibold">{b}</Link></li>
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
                <span className="block text-small text-muted">{t('mega.items', { n: n(meta.cats[x.slug].count) })}</span>
              </span>
              <Icon name="next" size={20} className="text-muted" />
            </button>
          </li>
        );
      })}
    </ul>
  );
}
