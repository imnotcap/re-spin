import { useRef, type FormEvent, type HTMLAttributes, type ReactNode } from 'react';
import { AppLink } from '../provider';
import { Icon } from '../icons/Icon';
import type { IconName } from '../icons/paths';
import { RESPIN_TABS, cx, type TabBarItem } from '../utils';
import { IconButton } from './Button';

export interface TopBarProps {
  title?: ReactNode;
  /** Tilbage-knap som handling… */
  onBack?: () => void;
  /** …eller som link */
  backHref?: string;
  left?: ReactNode;
  right?: ReactNode;
  align?: 'center' | 'left';
  border?: boolean;
  /** Transparent og lagt oven på indhold (fx billede) */
  floating?: boolean;
  className?: string;
  /** Erstatter titlen (fx en SearchBar) */
  children?: ReactNode;
}

export function TopBar({ title, onBack, backHref, left, right, align = 'center', border, floating, className, children }: TopBarProps) {
  const back = onBack || backHref !== undefined
    ? <IconButton icon="back" label="Tilbage" variant={floating ? 'glass' : 'plain'} onClick={onBack} href={backHref} />
    : null;
  const spacer = <span className="rs-topbar__spacer" />;
  return (
    <header className={cx('rs-topbar', align === 'left' && 'rs-topbar--left', border && 'rs-topbar--border', floating && 'rs-topbar--float', className)}>
      {left ?? back ?? (align === 'center' && title !== undefined ? spacer : null)}
      {children ?? (title !== undefined ? <h1 className="rs-topbar__title">{title}</h1> : <span className="rs-grow" />)}
      {right ?? (align === 'center' && title !== undefined ? spacer : null)}
    </header>
  );
}

export interface SearchBarProps {
  placeholder?: string;
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  /** Kaldes ved Enter/søg */
  onSearch?: (value: string) => void;
  /** Gør baren til et link (fx på forsiden → /search) i stedet for et input */
  href?: string;
  autoFocus?: boolean;
  name?: string;
}

export function SearchBar({ placeholder = 'Søg efter tøj, brands, bolig…', value, defaultValue, onChange, onSearch, href, autoFocus, name = 'q' }: SearchBarProps) {
  const ref = useRef<HTMLInputElement>(null);
  if (href !== undefined) {
    return (
      <AppLink href={href} className="rs-searchbar" aria-label="Søg">
        <Icon name="search" size={20} />
        <span className="rs-searchbar__ph">{placeholder}</span>
      </AppLink>
    );
  }
  const submit = (e: FormEvent) => { e.preventDefault(); onSearch?.(ref.current?.value.trim() ?? ''); };
  return (
    <form role="search" className="rs-searchbar" onSubmit={submit}>
      <Icon name="search" size={20} />
      <input ref={ref} type="search" name={name} enterKeyHint="search" placeholder={placeholder} aria-label="Søg" autoFocus={autoFocus}
        value={value} defaultValue={defaultValue} onChange={onChange ? (e) => onChange(e.target.value) : undefined} />
    </form>
  );
}

export interface TabBarProps {
  items?: ReadonlyArray<TabBarItem>;
  /** Midterknap (Sælg) */
  fab?: { href: string; label: string; icon?: IconName };
  /** id på den aktive fane */
  activeId?: string;
}

/** Bundnavigation med fremhævet Sælg-knap i midten. Standard: Hjem · Søg · Sælg · Beskeder · Profil. */
export function TabBar({ items = RESPIN_TABS.items, fab = RESPIN_TABS.fab, activeId }: TabBarProps) {
  const split = Math.floor(items.length / 2);
  const tab = (t: TabBarItem) => (
    <AppLink key={t.id} href={t.href} className="rs-tab" aria-current={activeId === t.id ? 'page' : undefined}>
      <Icon name={t.icon} size={24} />
      <span>{t.label}</span>
      {t.badge ? <span className="rs-badge-dot" aria-label={`${t.badge} nye`}>{t.badge}</span> : null}
    </AppLink>
  );
  return (
    <nav className="rs-tabbar" aria-label="Hovednavigation">
      {items.slice(0, split).map(tab)}
      <AppLink href={fab.href} className="rs-tab rs-tab--fab" aria-label={fab.label}>
        <span className="rs-fab"><Icon name={fab.icon ?? 'plus'} size={26} /></span>
      </AppLink>
      {items.slice(split).map(tab)}
    </nav>
  );
}

/** Mobil-ramme om hele appen (centreret og afrundet på desktop). `bare` fjerner rammen. */
export function AppShell({ bare, className, ...rest }: HTMLAttributes<HTMLDivElement> & { bare?: boolean }) {
  return <div className={cx('rs-shell', bare && 'rs-shell--bare', className)} {...rest} />;
}

/** En skærm i appen: fylder skal-rammen, med valgfri topbar/content/footer indeni. */
export function Screen({ bleed, className, ...rest }: HTMLAttributes<HTMLDivElement> & { bleed?: boolean }) {
  return <div className={cx('rs-screen', bleed && 'rs-screen--bleed', className)} {...rest} />;
}

export function ScreenContent({ withTabBar, withFooter, className, ...rest }: HTMLAttributes<HTMLDivElement> & { withTabBar?: boolean; withFooter?: boolean }) {
  return <div className={cx('rs-content', withTabBar && 'rs-content--tabs', withFooter && 'rs-content--footer', className)} {...rest} />;
}

/** Fast bundbar med handlinger (fx Byd / Køb nu). */
export function ScreenFooter({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cx('rs-footer', className)} {...rest} />;
}

export function Section({ flush, className, ...rest }: HTMLAttributes<HTMLElement> & { flush?: boolean }) {
  return <section className={cx('rs-section', flush && 'rs-section--flush', className)} {...rest} />;
}
