'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { Icon } from '@respin/ui';
import { CATEGORIES, type Category, type CategorySlug } from '../../lib/categories';
import { formatKr } from '@respin/ui/utils';
import { SHIPPING_PRICE_ORE } from '@respin/core/fees';
import type { MenuCategory, MenuMeta } from '../../lib/catalog';
import { categoryImage, itemImage } from '../../lib/images';
import { useI18n } from '../../lib/i18n/client';

const typeHref = (slug: string, sub?: string) => `/kategori/${slug}/${sub ? `?type=${encodeURIComponent(sub)}` : ''}`;
const groupHref = (slug: string, group: string) => `/kategori/${slug}/?gruppe=${encodeURIComponent(group)}`;
const OPEN_DELAY = 110;   // musen skal "hvile" et øjeblik, før menuen åbner (ingen blinken når man bare passerer)
const CLOSE_DELAY = 180;
const SHIPPING_FROM_KR = Number(SHIPPING_PRICE_ORE.small) / 100;

/**
 * Fordel sektionerne i højst n kolonner i rækkefølge (Tøj · Sko · Tasker …), så den højeste kolonne er så lav
 * som muligt. Få sektioner – prøv alle delinger.
 */
function balance<G extends { items: readonly string[] }>(groups: readonly G[], n: number): G[][] {
  const h = groups.map((g) => g.items.length + 2); // overskrift og luft tæller med
  let best: G[][] = [groups.slice()];
  let bestMax = Infinity;
  const split = (start: number, left: number, acc: G[][], max: number) => {
    if (max >= bestMax) return;
    if (left === 1 || start === groups.length) {
      const rest = groups.slice(start);
      const m = Math.max(max, rest.reduce((s, _, i) => s + h[start + i]!, 0));
      if (m < bestMax) { bestMax = m; best = rest.length ? [...acc, rest] : acc; }
      return;
    }
    let sum = 0;
    for (let end = start + 1; end <= groups.length; end++) {
      sum += h[end - 1]!;
      split(end, left - 1, [...acc, groups.slice(start, end)], Math.max(max, sum));
    }
  };
  split(0, n, [], 0);
  return best;
}

const catHref = (slug: string, q = '') => `/kategori/${slug}/${q}`;
const kicker = 'text-caption font-bold uppercase tracking-[0.1em]';
const count = 'font-mono text-caption tabular-nums text-muted';

/** Indholdet af megamenuen for én kategori: udforsk | typer | populære mærker | ugens fokus, og en bjælke nederst */
function MegaPanel({ c, meta, brandTotal, onNavigate, id }: { c: Category; meta: MenuCategory; brandTotal: number; onNavigate: () => void; id: string }) {
  const { t, n } = useI18n();
  const cat = t(`cat.${c.slug}`, undefined, c.label);
  const rows = [
    { href: catHref(c.slug, '?sort=nyeste'), label: t('mega.news'), extra: meta.newWeek > 0 ? <span className="inline-flex items-center gap-1.5 rounded-pill border border-[var(--rs-forest-50)] bg-[var(--rs-forest-50)] px-2 py-0.5 text-caption font-semibold text-forest"><span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-forest" />{t('mega.newWeek', { n: n(meta.newWeek) })}</span> : null },
    { href: catHref(c.slug, '?sort=populaere'), label: t('mega.popular'), extra: null },
    meta.likeNew > 0 ? { href: catHref(c.slug, `?stand=${encodeURIComponent('Ny med mærke')}`), label: t('cond.Ny med mærke', undefined, 'Ny med mærke'), extra: <span className={count}>{n(meta.likeNew)}</span> } : null,
    meta.under200 > 0 ? { href: catHref(c.slug, '?pris=under-200'), label: t('price.under-200', undefined, 'Under 200 kr.'), extra: <span className={count}>{n(meta.under200)}</span> } : null
  ].filter((x) => x !== null);
  const focusImg = meta.focus ? itemImage(meta.focus.itemId) : undefined;
  const cols = c.subs.length > 24 ? 3 : 2;

  return (
    <div id={id} className="mx-auto max-w-7xl">
      <div className="grid grid-cols-[280px_minmax(0,1fr)_200px_180px]">
        {/* Udforsk */}
        <div className="flex flex-col border-r border-line bg-sunken px-7 py-7">
          <p className={`${kicker} text-muted`}>{t('mega.explore', { cat })}</p>
          <Link href={catHref(c.slug)} onClick={onNavigate}
            className="mt-4 flex items-center justify-between gap-3 rounded-md border border-line bg-surface px-4 py-3 text-body font-semibold text-ink hover:border-slate">
            {t('mega.allIn', { cat })}
            <span className={`${count} inline-flex items-center gap-1`}>{n(meta.count)}<Icon name="arrow" size={14} /></span>
          </Link>
          <ul className="mt-2 flex flex-col">
            {rows.map((r) => (
              <li key={r.href}>
                <Link href={r.href} onClick={onNavigate} className="flex items-center justify-between gap-3 rounded-md px-4 py-2.5 text-body text-slate-700 hover:bg-surface hover:text-ink">
                  {r.label}{r.extra}
                </Link>
              </li>
            ))}
          </ul>
          {meta.sizes.length > 0 && (
            <div className="mt-auto border-t border-line pt-5">
              <p className="text-small font-semibold text-ink">{t('mega.sizeTitle')}</p>
              <ul className="mt-3 flex flex-wrap gap-2">
                {meta.sizes.map((s) => (
                  <li key={s}>
                    <Link href={catHref(c.slug, `?str=${encodeURIComponent(s)}`)} onClick={onNavigate} aria-label={t('mega.sizeLabel', { s, cat })}
                      className="inline-flex h-9 min-w-10 items-center justify-center rounded-md border border-line bg-surface px-2.5 text-small font-semibold text-ink hover:border-ink">{s}</Link>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-caption text-muted">{t('mega.sizeHint')}</p>
            </div>
          )}
        </div>

        {/* Underkategorier: sektionerne fordelt i lige høje kolonner (tre, når kategorien er stor) */}
        <div className={`grid min-w-0 gap-8 px-8 py-7 ${cols === 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>
          {balance(c.groups, cols).map((col, i) => (
            <div key={i} className="flex min-w-0 flex-col gap-6">
              {col.map((g) => {
                const label = t(`group.${g.label}`, undefined, g.label);
                return (
                  <section key={g.label} aria-label={label}>
                    <Link href={groupHref(c.slug, g.label)} onClick={onNavigate} className={`${kicker} block border-b border-line pb-3 text-ink hover:text-forest`}>{label}</Link>
                    <ul className="mt-2">
                      {g.items.map((x) => (
                        <li key={x}>
                          <Link href={typeHref(c.slug, x)} onClick={onNavigate} className={`block text-slate-700 underline-offset-4 hover:text-forest hover:underline ${cols === 3 ? 'py-1 text-small' : 'py-1.5 text-body'}`}>
                            {t(`sub.${x}`, undefined, x)}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </section>
                );
              })}
            </div>
          ))}
        </div>

        {/* Populære mærker */}
        <div className="flex flex-col border-l border-line px-7 py-7">
          <p className={`${kicker} border-b border-line pb-3 text-ink`}>{t('mega.brands')}</p>
          <ul className="mt-2">
            {meta.brands.map((b) => (
              <li key={b.brand}>
                <Link href={catHref(c.slug, `?maerke=${encodeURIComponent(b.brand)}`)} onClick={onNavigate}
                  className="flex items-center justify-between gap-3 py-1.5 text-body text-ink hover:text-forest">
                  <span className="truncate">{b.brand}</span><span className={count}>{n(b.count)}</span>
                </Link>
              </li>
            ))}
          </ul>
          <Link href="/maerker/" onClick={onNavigate} className="mt-auto flex items-center gap-1.5 border-t border-line pt-4 text-small font-semibold text-ink hover:text-forest">
            {t('mega.allBrands', { n: n(brandTotal) })}<Icon name="arrow" size={14} />
          </Link>
        </div>

        {/* Ugens fokus */}
        <div className="py-7 pr-7">
          {meta.focus && focusImg && (
            <Link href={typeHref(c.slug, meta.focus.sub)} onClick={onNavigate} className="group relative flex h-full min-h-[360px] flex-col justify-end overflow-hidden rounded-lg bg-slate text-white">
              <img src={focusImg.src} srcSet={focusImg.srcSet} sizes="200px" alt="" width={200} height={250} loading="lazy" decoding="async"
                className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04] motion-reduce:transition-none" />
              <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-3/5 bg-gradient-to-t from-black/75 to-transparent" />
              <span className={`${kicker} absolute left-3 top-3 rounded-sm bg-surface px-2 py-1 text-[10px] text-ink`}>{t('mega.focus')}</span>
              <span className="relative px-4 pb-4">
                <span className="block text-caption text-white/85">{t('mega.focusKicker')}</span>
                <span className="mt-1 block text-h3 font-bold leading-tight">{t(`sub.${meta.focus.sub}`, undefined, meta.focus.sub)}</span>
                <span className="mt-3 inline-flex items-center gap-1.5 border-b border-white pb-0.5 text-small font-semibold">{t('mega.focusCta')}<Icon name="arrow" size={14} /></span>
              </span>
            </Link>
          )}
        </div>
      </div>

      {/* Tryghed og salg */}
      <div className="flex items-center justify-between gap-6 border-t border-line bg-sunken px-7 py-3 text-small text-slate-700">
        <p className="flex items-center gap-2">
          <Icon name="shield" size={16} className="text-forest" />{t('mega.trust')}
          <span aria-hidden="true" className="mx-2 text-stone-400">·</span>{t('mega.shipping', { price: formatKr(SHIPPING_FROM_KR) })}
        </p>
        <p className="flex items-center gap-2">
          <span className="text-muted">{t('mega.sellQ')}</span>
          <Link href="/saelg/" onClick={onNavigate} className="inline-flex items-center gap-1 font-semibold text-forest underline-offset-4 hover:underline">{t('mega.sellCta')}<Icon name="arrow" size={14} /></Link>
        </p>
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
          <MegaPanel c={current} meta={meta.cats[current.slug]} brandTotal={meta.brandTotal} onNavigate={close} id={panelId} />
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
