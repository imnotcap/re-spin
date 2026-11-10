import { useState, type CSSProperties, type HTMLAttributes, type ReactNode } from 'react';
import { AppLink } from '../provider';
import { Icon } from '../icons/Icon';
import type { IconName } from '../icons/paths';
import { buyerTotal, cx, formatKr } from '../utils';
import { Avatar, Badge } from './Badge';

export interface Product {
  id: string | number;
  title: string;
  brand?: string;
  size?: string;
  /** Udbudspris i kr. */
  price: number;
  imageUrl?: string;
  /** Flere størrelser af billedet, fx "/a-480.webp 480w, /a-960.webp 960w" (browseren vælger) */
  imageSrcSet?: string;
  /** 0–3: nuance af den neutrale grå pladsholder (default udledt af id) */
  shade?: number;
  /** Stand, fx "Næsten ny" – vises i meta-linjen */
  condition?: string;
}

const shadeFor = (id: string | number): number => {
  if (typeof id === 'number') return Math.abs(id) % 4;
  let h = 0;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h % 4;
};

export interface ProductImageProps {
  src?: string;
  /** Flere størrelser, fx "/a-480.webp 480w, /a-960.webp 960w" */
  srcSet?: string;
  /** Hvor bredt billedet vises, fx "(min-width: 1024px) 220px, 50vw" */
  sizes?: string;
  /** Vigtigt billede øverst på siden: hentes med det samme i stedet for lazy.
   *  (Bevidst uden fetchPriority="high": React laver så en preload, som også hentes, når siden blot forhåndshentes.) */
  priority?: boolean;
  alt: string;
  shade?: number;
  ratio?: '34' | 'sq' | 'wide';
  className?: string;
  /** Egen billedkomponent (fx `<Image fill … />` fra next/image). Overstyrer `src`. */
  image?: ReactNode;
  children?: ReactNode;
}

/**
 * Produktbillede. Uden billede vises en neutral grå flade (pladsholder).
 * `alt=""` betyder dekorativt: elementet skjules for skærmlæsere (i stedet for et "billede" uden navn).
 */
export function ProductImage({ src, srcSet, sizes, priority, alt, shade = 0, ratio = '34', className, image, children }: ProductImageProps) {
  const decorative = alt.trim() === '';
  const placeholder = !src && !image;
  return (
    <div className={cx('rs-ph', `rs-ph--${ratio}`, !placeholder && 'rs-ph--photo', className)} style={{ '--rs-ph-bg': `var(--rs-ph-${(Math.abs(shade) % 4) + 1})` } as CSSProperties}
      role={placeholder && !decorative ? 'img' : undefined} aria-label={placeholder && !decorative ? alt : undefined} aria-hidden={decorative ? true : undefined}>
      {image ?? (src ? (
        <img src={src} srcSet={srcSet} sizes={sizes} alt={alt} loading={priority ? 'eager' : 'lazy'} decoding="async" />
      ) : null)}
      {children}
    </div>
  );
}

export interface FavoriteButtonProps {
  pressed?: boolean;
  defaultPressed?: boolean;
  onPressedChange?: (pressed: boolean) => void;
  /** Hvid rund baggrund (til brug over billeder). Default true. */
  glass?: boolean;
  className?: string;
}

/** Hjerte-knap med pop-animation. Kontrolleret (`pressed`) eller ukontrolleret (`defaultPressed`). */
export function FavoriteButton({ pressed, defaultPressed = false, onPressedChange, glass = true, className }: FavoriteButtonProps) {
  const [inner, setInner] = useState(defaultPressed);
  const [pop, setPop] = useState(false);
  const on = pressed ?? inner;
  return (
    <button
      type="button"
      className={cx('rs-iconbtn', 'rs-fav', glass && 'rs-iconbtn--glass', pop && 'rs-pop', className)}
      aria-pressed={on}
      aria-label={on ? 'Fjern fra favoritter' : 'Gem som favorit'}
      onAnimationEnd={() => setPop(false)}
      onClick={() => { const next = !on; if (pressed === undefined) setInner(next); setPop(true); onPressedChange?.(next); }}
    >
      <Icon name="heart" size={20} />
    </button>
  );
}

export function Price({ amount, className, ...rest }: { amount: number } & HTMLAttributes<HTMLSpanElement>) {
  return <span className={cx('rs-t-price', className)} {...rest}>{formatKr(amount)}</span>;
}

export interface ProductCardProps {
  product: Product;
  href: string;
  /** Lille label på billedet, fx "Ny med mærke" eller "Certificeret" */
  badge?: string;
  favorite?: boolean;
  defaultFavorite?: boolean;
  onFavoriteChange?: (favorite: boolean) => void;
  /** Skjul hjertet */
  hideFavorite?: boolean;
  /** Antal der har gemt varen – vises nederst på billedet */
  favoriteCount?: number;
  /** Sælgeren over billedet (som i et feed) */
  seller?: { name: string; certified?: boolean };
  /** Ikon i den grå pladsholder, når varen ikke har et billede (fx "shirt", "sneaker") */
  placeholderIcon?: IconName;
  /** scroll = fast bredde til vandrette rækker */
  variant?: 'grid' | 'scroll';
  /** Egen billedkomponent, fx next/image */
  image?: ReactNode;
  /** Hvor bredt billedet vises (til `imageSrcSet`). Default passer til et responsivt gitter. */
  imageSizes?: string;
}

/**
 * Produktkort: billede, titel, mærke · størrelse · stand, pris og prisen inkl. køberbeskyttelse
 * (præcis til øren – samme beregning som checkout). Hele kortet er ét link; hjertet er en separat knap.
 */
export function ProductCard({ product, href, badge, favorite, defaultFavorite, onFavoriteChange, hideFavorite, favoriteCount, seller, placeholderIcon, variant = 'grid', image, imageSizes = '(min-width: 1280px) 200px, (min-width: 640px) 25vw, calc(50vw - 24px)' }: ProductCardProps) {
  const { id, title, brand, size, condition, price, imageUrl, imageSrcSet, shade } = product;
  const meta = [brand, size, condition].filter(Boolean).join(' · ');
  const incl = formatKr(buyerTotal(price));
  const label = [title, meta, formatKr(price), `${incl} inkl. køberbeskyttelse`, seller && `sælges af ${seller.name}${seller.certified ? ' (certificeret)' : ''}`].filter(Boolean).join(', ');
  return (
    <article className={cx('rs-card', variant === 'scroll' && 'rs-card--h')}>
      {seller && (
        <div className="rs-card__seller" aria-hidden="true">
          <Avatar name={seller.name} size="sm" />
          <span className="rs-card__seller-name">{seller.name}</span>
          {seller.certified && <Icon name="check" size={14} className="rs-card__cert" />}
        </div>
      )}
      {/* Linkets navn er skjult tekst + synligt indhold (fx mærkaten) – intet aria-label, så navn og synlig tekst altid stemmer */}
      <AppLink href={href}>
        <span className="rs-sr-only">{label}</span>
        <div className="rs-card__media">
          <ProductImage src={imageUrl} srcSet={imageSrcSet} sizes={imageSrcSet ? imageSizes : undefined} alt="" shade={shade ?? shadeFor(id)} image={image}>
            {!imageUrl && !image && placeholderIcon ? <Icon name={placeholderIcon} size={64} /> : null}
          </ProductImage>
          {badge && <Badge>{badge}</Badge>}
          {favoriteCount !== undefined && favoriteCount > 0 && (
            <span className="rs-card__likes" aria-hidden="true"><Icon name="heart" size={12} />{favoriteCount}</span>
          )}
        </div>
      </AppLink>
      {!hideFavorite && (
        <div className={cx('rs-card__fav', seller && 'rs-card__fav--seller')}>
          <FavoriteButton pressed={favorite} defaultPressed={defaultFavorite} onPressedChange={onFavoriteChange} />
        </div>
      )}
      <AppLink href={href} tabIndex={-1} aria-hidden="true">
        <div className="rs-card__title">{title}</div>
        {meta && <div className="rs-card__meta">{meta}</div>}
        <div className="rs-card__price rs-t-price">{formatKr(price)}</div>
        <div className="rs-card__incl"><Icon name="shield" size={12} />{incl} inkl.</div>
      </AppLink>
    </article>
  );
}

export interface ProductGridProps extends HTMLAttributes<HTMLDivElement> {
  /** app = altid 2 kolonner med sidemargen (mobilapp). responsive = så mange kolonner, der er plads til (hjemmeside). */
  layout?: 'app' | 'responsive';
}

export function ProductGrid({ layout = 'app', className, ...rest }: ProductGridProps) {
  return <div className={cx(layout === 'app' ? 'rs-grid-2' : 'rs-grid-auto', className)} {...rest} />;
}

/** Vandret scroll-række (kategorier, produktkort). */
export function HScroll({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cx('rs-hscroll', className)} {...rest} />;
}

/** Kompakt række med miniature, fx i betaling og ordrer. */
export function ProductRow({ product, href, trailing }: { product: Product; href?: string; trailing?: ReactNode }) {
  const body = (
    <>
      <div className="rs-card__media" style={{ width: 64, borderRadius: 12 }}>
        <ProductImage src={product.imageUrl} alt={product.title} ratio="sq" shade={product.shade ?? shadeFor(product.id)} />
      </div>
      <div className="rs-grow">
        <div className="rs-card__title" style={{ margin: 0 }}>{product.title}</div>
        <div className="rs-card__meta">{[product.brand, product.size].filter(Boolean).join(' · ')}</div>
      </div>
      {trailing}
    </>
  );
  return href ? <AppLink href={href} className="rs-card--row">{body}</AppLink> : <div className="rs-card--row">{body}</div>;
}

export interface CategoryTileProps {
  icon: IconName;
  label: ReactNode;
  href: string;
  /** Antal varer – vises under navnet i `card`-varianten */
  count?: number;
  /** icon = lille rund genvej (app). card = kort med ikon. photo = foto med navn under. illustration = tegning med navn centreret under (hjemmeside). */
  variant?: 'icon' | 'card' | 'photo' | 'illustration';
  /** Foto til `photo`-varianten / tegning (SVG) til `illustration`-varianten (kvadratisk) */
  imageSrc?: string;
  /** Flere bredder af fotoet, så små fliser ikke henter store billeder */
  imageSrcSet?: string;
  imageSizes?: string;
}

export function CategoryTile({ icon, label, href, count, variant = 'icon', imageSrc, imageSrcSet, imageSizes = '(min-width: 1024px) 140px, (min-width: 640px) 18vw, 128px' }: CategoryTileProps) {
  if (variant === 'illustration') {
    return (
      <AppLink href={href} className="rs-catillu">
        {/* Tegningen er pynt – navnet under er linkets tekst */}
        {imageSrc && <img className="rs-catillu__img" src={imageSrc} alt="" loading="lazy" decoding="async" width={128} height={128} />}
        <span className="rs-catillu__label">{label}</span>
      </AppLink>
    );
  }
  if (variant === 'photo') {
    return (
      <AppLink href={href} className="rs-catphoto">
        {/* Sløret foto som baggrund (lille billede er nok – det er sløret) og kategoriens ikon i en hvid cirkel ovenpå */}
        <span className="rs-catphoto__img">
          {imageSrc && <img src={imageSrc} srcSet={imageSrcSet} sizes={imageSrcSet ? imageSizes : undefined} alt="" loading="lazy" decoding="async" width={240} height={240} />}
          <span className="rs-catphoto__icon"><Icon name={icon} size={28} /></span>
        </span>
        <span className="rs-catphoto__label">{label}</span>
        {count !== undefined && <span className="rs-catphoto__count">{count.toLocaleString('da-DK')} {count === 1 ? 'vare' : 'varer'}</span>}
      </AppLink>
    );
  }
  if (variant === 'card') {
    return (
      <AppLink href={href} className="rs-catcard">
        <span className="rs-catcard__icon"><Icon name={icon} size={32} /></span>
        <span className="rs-catcard__label">{label}</span>
        {count !== undefined && <span className="rs-catcard__count">{count.toLocaleString('da-DK')} {count === 1 ? 'vare' : 'varer'}</span>}
      </AppLink>
    );
  }
  return (
    <AppLink href={href} className="rs-cat">
      <span className="rs-cat__icon"><Icon name={icon} size={28} /></span>
      {label}
    </AppLink>
  );
}

export interface SectionHeaderProps {
  title: ReactNode;
  /** Kort forklaring under titlen */
  description?: ReactNode;
  action?: { label: ReactNode; href: string };
  /** Id på overskriften – brug til `aria-labelledby` på sektionen */
  id?: string;
  className?: string;
}

export function SectionHeader({ title, description, action, id, className }: SectionHeaderProps) {
  return (
    <div className={cx('rs-section-head', className)}>
      <div>
        <h2 id={id} className="rs-t-h2">{title}</h2>
        {description && <p className="rs-section-head__desc">{description}</p>}
      </div>
      {action && <AppLink href={action.href} className="rs-section-head__action">{action.label}<Icon name="next" size={16} /></AppLink>}
    </div>
  );
}

/** Kampagnebanner (lime-gradient). */
export function Hero({ title, children, className }: { title: ReactNode; children?: ReactNode; className?: string }) {
  return (
    <section className={cx('rs-hero', className)}>
      <h2 className="rs-t-display" style={{ fontSize: 28, lineHeight: '32px', maxWidth: 220 }}>{title}</h2>
      {children && <div>{children}</div>}
    </section>
  );
}

/** Saldokort (mørk grafit). */
export function BalanceCard({ label = 'Tilgængeligt til udbetaling', amount, children }: { label?: string; amount: number; children?: ReactNode }) {
  return (
    <div className="rs-balance">
      <div className="rs-t-small" style={{ opacity: 0.8 }}>{label}</div>
      <div className="rs-t-display" style={{ fontSize: 44, lineHeight: '50px', margin: '8px 0 20px', color: 'var(--rs-cream)' }}>{formatKr(amount)}</div>
      {children}
    </div>
  );
}
