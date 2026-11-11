import type { HTMLAttributes, ReactNode } from 'react';
import { AppLink } from '../provider';
import { Icon } from '../icons/Icon';
import type { IconName } from '../icons/paths';
import { cx } from '../utils';

export type BadgeTone = 'neutral' | 'lime' | 'coral' | 'forest' | 'soft' | 'warn';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
  icon?: IconName;
  /** Pulserende prik foran teksten */
  live?: boolean;
}

export function Badge({ tone = 'neutral', icon, live, className, children, ...rest }: BadgeProps) {
  return (
    <span className={cx('rs-badge', tone !== 'neutral' && `rs-badge--${tone}`, live && 'rs-badge--live', className)} {...rest}>
      {icon && <Icon name={icon} size={12} />}
      {children}
    </span>
  );
}

/** "Certificeret"-mærket for certificerede sælgere (verificeret identitet og gode handler). */
export function CertifiedBadge({ label = 'Certificeret', ...rest }: Omit<BadgeProps, 'tone' | 'icon'> & { label?: string }) {
  return <Badge tone="forest" icon="check" {...rest}>{label}</Badge>;
}

export interface ChipProps extends Omit<HTMLAttributes<HTMLElement>, 'onClick'> {
  /** Sæt for at gøre chippen til en til/fra-knap (aria-pressed) */
  pressed?: boolean;
  icon?: IconName;
  size?: 'md' | 'sm';
  /** Neutralt tag-udseende (ikke interaktivt) */
  tag?: boolean;
  href?: string;
  onClick?: () => void;
  children?: ReactNode;
}

export function Chip({ pressed, icon, size = 'md', tag, href, onClick, className, children, ...rest }: ChipProps) {
  const cls = cx('rs-chip', size === 'sm' && 'rs-chip--sm', tag && 'rs-chip--tag', className);
  const inner = (<>{icon && <Icon name={icon} size={16} />}{children}</>);
  if (href !== undefined) return <AppLink href={href} className={cls} {...rest}>{inner}</AppLink>;
  return <button type="button" className={cls} aria-pressed={pressed} onClick={onClick} {...rest}>{inner}</button>;
}

export interface AvatarProps extends HTMLAttributes<HTMLSpanElement> {
  name: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  online?: boolean;
  src?: string;
}

export function Avatar({ name, size = 'md', online, src, className, ...rest }: AvatarProps) {
  return (
    <span className={cx('rs-avatar', size !== 'md' && `rs-avatar--${size}`, className)} aria-hidden="true" {...rest}>
      {src ? <img src={src} alt="" loading="lazy" decoding="async" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} /> : (name.trim()[0] ?? '?').toUpperCase()}
      {online && <span className="rs-online" />}
    </span>
  );
}

export function Rating({ value, count, className }: { value: number; count?: number | string; className?: string }) {
  const v = value.toLocaleString('da-DK', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const c = count === undefined ? '' : typeof count === 'number' ? count.toLocaleString('da-DK') : count;
  return (
    <span className={cx('rs-rating', className)} role="img" aria-label={`Vurdering ${v} af 5${c ? `, ${c}` : ''}`}>
      <Icon name="star" size={14} />
      <span aria-hidden="true">{v}</span>
      {c && <span className="rs-count" aria-hidden="true">({c})</span>}
    </span>
  );
}
