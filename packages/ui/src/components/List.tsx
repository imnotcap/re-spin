import type { HTMLAttributes, ReactNode } from 'react';
import { AppLink } from '../provider';
import { Avatar } from './Badge';
import { Icon } from '../icons/Icon';
import type { IconName } from '../icons/paths';
import { cx } from '../utils';

export function List({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cx('rs-list', className)} {...rest} />;
}

export interface ListRowProps {
  icon?: IconName;
  title: ReactNode;
  description?: ReactNode;
  /** Indhold til højre (fx Toggle, beløb). Fjerner pilen. */
  trailing?: ReactNode;
  href?: string;
  onClick?: () => void;
  danger?: boolean;
  /** Vis pil til højre (default true når der ikke er `trailing`) */
  chevron?: boolean;
}

/** Række i en List. Renderes som link (href), knap (onClick) eller div. */
export function ListRow({ icon, title, description, trailing, href, onClick, danger, chevron }: ListRowProps) {
  const showChevron = chevron ?? !trailing;
  const cls = cx('rs-lrow', danger && 'rs-lrow--danger');
  const inner = (
    <>
      {icon && <span className="rs-lrow__icon"><Icon name={icon} size={20} /></span>}
      <span className="rs-grow">
        <span className="rs-lrow__title" style={{ display: 'block' }}>{title}</span>
        {description && <span className="rs-lrow__sub">{description}</span>}
      </span>
      {trailing}
      {showChevron && <Icon name="next" size={20} />}
    </>
  );
  if (href !== undefined) return <AppLink href={href} className={cls}>{inner}</AppLink>;
  if (onClick || !trailing) return <button type="button" className={cls} onClick={onClick}>{inner}</button>;
  return <div className={cls}>{inner}</div>;
}

export interface ConversationRowProps {
  name: string;
  preview: string;
  time: string;
  /** Titel på varen samtalen handler om */
  itemTitle?: string;
  unread?: boolean;
  online?: boolean;
  href: string;
}

export function ConversationRow({ name, preview, time, itemTitle, unread, online, href }: ConversationRowProps) {
  return (
    <AppLink href={href} className={cx('rs-convo', unread && 'rs-convo--unread')}>
      <Avatar name={name} online={online} />
      <div className="rs-convo__body">
        <div className="rs-convo__top"><span className="rs-t-bold">{name}</span><span className="rs-t-caption rs-t-muted">{time}</span></div>
        <div className="rs-convo__preview">{preview}</div>
        {itemTitle && <div className="rs-t-caption rs-t-muted">{itemTitle}</div>}
      </div>
      {unread && <span className="rs-unread" aria-label="Ulæst" />}
    </AppLink>
  );
}

/** Genvejsflise (fx på profilen). Brug i et `.rs-grid-tiles`-gitter via <TileGrid>. */
export function Tile({ icon, label, value, href }: { icon: IconName; label: string; value: ReactNode; href: string }) {
  return (
    <AppLink href={href} className="rs-tile">
      <span className="rs-tile__icon"><Icon name={icon} size={20} /></span>
      <span className="rs-t-small rs-t-muted">{label}</span>
      <b className="rs-t-h3">{value}</b>
    </AppLink>
  );
}
export function TileGrid({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cx('rs-grid-tiles', className)} {...rest} />;
}

export function Stat({ value, label }: { value: ReactNode; label: string }) {
  return <div className="rs-stat"><b>{value}</b><span>{label}</span></div>;
}
