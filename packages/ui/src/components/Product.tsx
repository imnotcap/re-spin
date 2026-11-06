import { useState, type CSSProperties, type HTMLAttributes, type ReactNode } from 'react';
import { AppLink } from '../provider';
import { Icon } from '../icons/Icon';
import type { IconName } from '../icons/paths';
import { buyerFee, cx, formatKr } from '../utils';
import { Badge } from './Badge';

export interface Product {
  id: string | number;
  title: string;
  brand?: string;
  size?: string;
  /** Udbudspris i kr. */
  price: number;
  imageUrl?: string;
  /** 0–3: nuance af den neutrale grå pladsholder (default udledt af id) */
  shade?: number;
}

const shadeFor = (id: string | number): number => {
  if (typeof id === 'number') return Math.abs(id) % 4;
  let h = 0;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h % 4;
};

export interface ProductImageProps {
  src?: string;
  alt: string;
  shade?: number;
  ratio?: '34' | 'sq' | 'wide';
  className?: string;
  /** Egen billedkomponent (fx `<Image fill … />` fra next/image). Overstyrer `src`. */
  image?: ReactNode;
  children?: ReactNode;
}

/** Produktbillede. Uden billede vises en neutral grå flade (pladsholder). */
export function ProductImage({ src, alt, shade = 0, ratio = '34', className, image, children }: ProductImageProps) {
  return (
    <div className={cx('rs-ph', `rs-ph--${ratio}`, className)} style={{ '--rs-ph-bg': `var(--rs-ph-${(shade % 4) + 1})` } as CSSProperties} role={src || image ? undefined : 'img'} aria-label={src || image ? undefined : alt}>
      {image ?? (src ? <img src={src} alt={alt} loading="lazy" /> : null)}
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
  /** Lille label på billedet, fx stand ("Næsten ny") */
  badge?: string;
  favorite?: boolean;
  defaultFavorite?: boolean;
  onFavoriteChange?: (favorite: boolean) => void;
  /** Skjul hjertet */
  hideFavorite?: boolean;
  /** scroll = fast bredde til vandrette rækker */
  variant?: 'grid' | 'scroll';
  /** Egen billedkomponent, fx next/image */
  image?: ReactNode;
}

/** Produktkort: billede, titel, brand · størrelse og pris (inkl. køberbeskyttelse). */
export function ProductCard({ product, href, badge, favorite, defaultFavorite, onFavoriteChange, hideFavorite, variant = 'grid', image }: ProductCardProps) {
  const { id, title, brand, size, price, imageUrl, shade } = product;
  const meta = [brand, size].filter(Boolean).join(' · ');
  return (
    <article className={cx('rs-card', variant === 'scroll' && 'rs-card--h')}>
      <AppLink href={href} aria-label={`${title}, ${formatKr(price)}`}>
        <div className="rs-card__media">
          <ProductImage src={imageUrl} alt={title} shade={shade ?? shadeFor(id)} image={image} />
          {badge && <Badge>{badge}</Badge>}
        </div>
      </AppLink>
      {!hideFavorite && (
        <div className="rs-card__fav">
          <FavoriteButton pressed={favorite} defaultPressed={defaultFavorite} onPressedChange={onFavoriteChange} />
        </div>
      )}
      <AppLink href={href} tabIndex={-1} aria-hidden="true">
        <div className="rs-card__title">{title}</div>
        {meta && <div className="rs-card__meta">{meta}</div>}
        <div className="rs-card__price rs-t-price">{formatKr(price)}<small>{formatKr(price + buyerFee(price))} inkl.</small></div>
      </AppLink>
    </article>
  );
}

export function ProductGrid({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cx('rs-grid-2', className)} {...rest} />;
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

export function CategoryTile({ icon, label, href }: { icon: IconName; label: string; href: string }) {
  return (
    <AppLink href={href} className="rs-cat">
      <span className="rs-cat__icon"><Icon name={icon} size={28} /></span>
      {label}
    </AppLink>
  );
}

export function SectionHeader({ title, action }: { title: string; action?: { label: string; href: string } }) {
  return (
    <div className="rs-section-head">
      <h2 className="rs-t-h2">{title}</h2>
      {action && <AppLink href={action.href}>{action.label}</AppLink>}
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
