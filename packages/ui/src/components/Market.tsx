import { useId, useState, type CSSProperties, type ReactNode } from 'react';
import { AppLink } from '../provider';
import { Icon } from '../icons/Icon';
import type { IconName } from '../icons/paths';
import { buyerFee, buyerTotal, cx, formatKr } from '../utils';
import { Avatar, CertifiedBadge, Rating } from './Badge';

/* ---------------------------------------------------------------------------
 * Elementer til markedspladsens hjemmeside: brødkrummer, detaljeliste, sælgerkort,
 * gennemskuelig pris, tryghedslinje og produktgalleri.
 * ------------------------------------------------------------------------- */

export interface Crumb { label: string; href?: string }

/** Brødkrummer. Sidste punkt er den aktuelle side (`aria-current="page"`). */
export function Breadcrumbs({ items, className }: { items: ReadonlyArray<Crumb>; className?: string }) {
  return (
    <nav aria-label="Brødkrummer" className={cx('rs-crumbs', className)}>
      <ol>
        {items.map((c, i) => {
          const last = i === items.length - 1;
          return (
            <li key={`${c.label}-${i}`}>
              {c.href && !last ? <AppLink href={c.href}>{c.label}</AppLink> : <span aria-current={last ? 'page' : undefined}>{c.label}</span>}
              {!last && <Icon name="next" size={14} className="rs-crumbs__sep" />}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/** Nøgle/værdi-liste (`<dl>`), fx varens detaljer: Mærke, Størrelse, Stand … */
export function DetailList({ items, className }: { items: ReadonlyArray<readonly [label: string, value: ReactNode]>; className?: string }) {
  return (
    <dl className={cx('rs-details', className)}>
      {items.map(([label, value]) => (
        <div key={label} className="rs-details__row">
          <dt>{label}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  );
}

export interface SellerCardProps {
  name: string;
  href?: string;
  /** Gennemsnitlig vurdering 0–5 */
  rating?: number;
  reviews?: number;
  certified?: boolean;
  /** Ekstra linjer, fx "Aarhus" og "Svarer typisk inden for 2 timer" */
  facts?: ReadonlyArray<{ icon: IconName; text: string }>;
  /** Overskriftsniveau for navnet (default 3) */
  headingLevel?: 2 | 3;
  className?: string;
}

/** Sælgerkort: hvem sælger, hvor godt de er bedømt, og om de er certificerede. */
export function SellerCard({ name, href, rating, reviews, certified, facts, headingLevel = 3, className }: SellerCardProps) {
  const H = `h${headingLevel}` as 'h2' | 'h3';
  return (
    <section className={cx('rs-seller', className)} aria-label={`Sælger: ${name}`}>
      <div className="rs-seller__head">
        <Avatar name={name} size="lg" />
        <div className="rs-grow">
          <H className="rs-seller__name">{href ? <AppLink href={href}>{name}</AppLink> : name}</H>
          <div className="rs-seller__meta">
            {rating !== undefined && <Rating value={rating} count={reviews !== undefined ? `${reviews} anmeldelser` : undefined} />}
            {certified && <CertifiedBadge />}
          </div>
        </div>
      </div>
      {facts && facts.length > 0 && (
        <ul className="rs-seller__facts">
          {facts.map((f) => <li key={f.text}><Icon name={f.icon} size={16} />{f.text}</li>)}
        </ul>
      )}
    </section>
  );
}

export interface PriceDetailsProps {
  /** Varens pris i kr. */
  price: number;
  /** Laveste fragtpris i kr. – vises som "Fragt fra …" */
  shippingFrom?: number;
  className?: string;
}

/**
 * Gennemskuelig pris: varens pris, prisen inkl. køberbeskyttelse og en udfoldelig opdeling.
 * Bruger `<details>`, så opdelingen virker uden JavaScript og læses korrekt af skærmlæsere.
 */
export function PriceDetails({ price, shippingFrom, className }: PriceDetailsProps) {
  return (
    <div className={cx('rs-pricedetails', className)}>
      <p className="rs-pricedetails__price rs-t-price">{formatKr(price)}</p>
      <details className="rs-pricedetails__more">
        <summary>
          <Icon name="shield" size={16} />
          <span><b>{formatKr(buyerTotal(price))}</b> inkl. køberbeskyttelse</span>
          <Icon name="down" size={16} className="rs-pricedetails__chev" />
        </summary>
        <dl className="rs-pricedetails__rows">
          <div><dt>Varens pris</dt><dd>{formatKr(price)}</dd></div>
          <div><dt>Køberbeskyttelse (5 % + 3 kr.)</dt><dd>{formatKr(buyerFee(price))}</dd></div>
          <div className="rs-pricedetails__total"><dt>I alt før fragt</dt><dd>{formatKr(buyerTotal(price))}</dd></div>
          {shippingFrom !== undefined && <div><dt>Fragt</dt><dd>fra {formatKr(shippingFrom)}</dd></div>}
        </dl>
        <p className="rs-pricedetails__note">Køberbeskyttelsen dækker, hvis varen ikke kommer frem eller ikke er som beskrevet. Sælger kan ikke ændre den.</p>
      </details>
    </div>
  );
}

export interface TrustItem { icon: IconName; title: string; text?: string; href?: string }

/**
 * Række af korte løfter (køberbeskyttelse, gratis oprettelse …) med ikon.
 * cards = kort i et gitter. compact = én smal linje (kun titel), der kan scrolles vandret på mobil.
 */
export function TrustBar({ items, variant = 'cards', className }: { items: ReadonlyArray<TrustItem>; variant?: 'cards' | 'compact'; className?: string }) {
  return (
    <ul className={cx('rs-trust', variant === 'compact' && 'rs-trust--compact', className)}>
      {items.map((it) => {
        const body = (<><span className="rs-trust__icon"><Icon name={it.icon} size={variant === 'compact' ? 18 : 20} /></span><span><b>{it.title}</b>{it.text && variant === 'cards' && <span className="rs-trust__text">{it.text}</span>}</span></>);
        return <li key={it.title}>{it.href ? <AppLink href={it.href} className="rs-trust__item">{body}</AppLink> : <span className="rs-trust__item">{body}</span>}</li>;
      })}
    </ul>
  );
}

export interface GalleryImage { src?: string; srcSet?: string; alt: string; shade?: number }

export interface ProductGalleryProps {
  images: ReadonlyArray<GalleryImage>;
  /** Hvor bredt hovedbilledet vises (til `srcSet`) */
  sizes?: string;
  /** Ikon i den grå pladsholder, når billeder mangler */
  placeholderIcon?: IconName;
  className?: string;
}

/** Produktgalleri med miniaturer. Miniaturerne er knapper (`aria-pressed`) – virker med tastatur. */
export function ProductGallery({ images, placeholderIcon, sizes = '(min-width: 1024px) 50vw, 100vw', className }: ProductGalleryProps) {
  const [active, setActive] = useState(0);
  const uid = useId();
  const cur = images[Math.min(active, images.length - 1)];
  if (!cur) return null;
  const tile = (img: GalleryImage, large: boolean) => (
    <div className={cx('rs-ph', 'rs-ph--34', img.src && 'rs-ph--photo')} style={{ '--rs-ph-bg': `var(--rs-ph-${(Math.abs(img.shade ?? 0) % 4) + 1})` } as CSSProperties}
      role={!img.src && large ? 'img' : undefined} aria-label={!img.src && large ? img.alt : undefined}>
      {img.src ? <img src={img.src} srcSet={img.srcSet} sizes={img.srcSet ? (large ? sizes : '120px') : undefined} alt={large ? img.alt : ''} loading={large ? 'eager' : 'lazy'} decoding="async" /> : placeholderIcon ? <Icon name={placeholderIcon} size={large ? 96 : 32} /> : null}
    </div>
  );
  return (
    <div className={cx('rs-gallery', className)}>
      <div className="rs-gallery__main" id={`${uid}-main`} aria-live="polite">
        {tile(cur, true)}
        {images.length > 1 && <span className="rs-gallery__count" aria-hidden="true">{active + 1}/{images.length}</span>}
      </div>
      {images.length > 1 && (
        <div className="rs-gallery__thumbs" role="group" aria-label="Vælg billede">
          {images.map((img, i) => (
            <button key={i} type="button" className="rs-gallery__thumb" aria-pressed={i === active} aria-controls={`${uid}-main`}
              aria-label={`Billede ${i + 1} af ${images.length}: ${img.alt}`} onClick={() => setActive(i)}>
              {tile(img, false)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export interface Step { title: string; text: ReactNode }

/** Nummererede trin (fx "Sådan sælger du"): store tal, tynde skillelinjer – ingen kort. */
export function StepList({ steps, headingLevel = 3, className }: { steps: ReadonlyArray<Step>; headingLevel?: 3 | 4; className?: string }) {
  const H = `h${headingLevel}` as 'h3' | 'h4';
  return (
    <ol className={cx('rs-steps', className)}>
      {steps.map((s, i) => (
        <li key={s.title} className="rs-steps__item">
          <span className="rs-steps__n" aria-hidden="true">{i + 1}</span>
          <div>
            <H className="rs-steps__title">{s.title}</H>
            <div className="rs-steps__text">{s.text}</div>
          </div>
        </li>
      ))}
    </ol>
  );
}

export interface AccordionItem { title: string; content: ReactNode }

/** Spørgsmål og svar m.m. Bygget på <details>, så det virker uden JavaScript og med tastatur. */
export function Accordion({ items, className }: { items: ReadonlyArray<AccordionItem>; className?: string }) {
  return (
    <div className={cx('rs-acc', className)}>
      {items.map((it) => (
        <details key={it.title} className="rs-acc__item">
          <summary className="rs-acc__summary">
            <span>{it.title}</span>
            <Icon name="down" size={20} className="rs-acc__chev" />
          </summary>
          <div className="rs-acc__content">{it.content}</div>
        </details>
      ))}
    </div>
  );
}
