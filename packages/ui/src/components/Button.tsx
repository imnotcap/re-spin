import { forwardRef, type AnchorHTMLAttributes, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { AppLink } from '../provider';
import { Icon } from '../icons/Icon';
import type { IconName } from '../icons/paths';
import { cx } from '../utils';

export type ButtonVariant = 'primary' | 'dark' | 'buy' | 'forest' | 'outline' | 'ghost' | 'ghost-inverse';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonBase {
  /** primary = lime (næste skridt) · buy = grafit (køb) · outline = sekundær */
  variant?: ButtonVariant;
  size?: ButtonSize;
  full?: boolean;
  icon?: IconName;
  iconRight?: IconName;
  children?: ReactNode;
}
export type ButtonAsButton = ButtonBase & Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> & { href?: undefined };
export type ButtonAsLink = ButtonBase & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'children'> & { href: string };
export type ButtonProps = ButtonAsButton | ButtonAsLink;

/** Knap. Med `href` renderes den som link (via RespinProvider's linkComponent). */
export const Button = forwardRef<HTMLElement, ButtonProps>(function Button(props, ref) {
  const { variant = 'primary', size = 'md', full, icon, iconRight, children, className, ...rest } = props;
  const cls = cx('rs-btn', `rs-btn--${variant}`, size !== 'md' && `rs-btn--${size}`, full && 'rs-btn--full', className);
  const inner = (
    <>
      {icon && <Icon name={icon} size={20} />}
      {children}
      {iconRight && <Icon name={iconRight} size={20} />}
    </>
  );
  if ('href' in rest && rest.href !== undefined) {
    return <AppLink ref={ref as React.Ref<HTMLAnchorElement>} className={cls} {...(rest as AnchorHTMLAttributes<HTMLAnchorElement> & { href: string })}>{inner}</AppLink>;
  }
  const { type = 'button', ...btn } = rest as ButtonHTMLAttributes<HTMLButtonElement>;
  return <button ref={ref as React.Ref<HTMLButtonElement>} type={type} className={cls} {...btn}>{inner}</button>;
});

export interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  icon: IconName;
  /** Påkrævet: skærmlæser-label */
  label: string;
  /** glass = hvid rund knap oven på billeder · soft = grå flade */
  variant?: 'plain' | 'glass' | 'soft';
  href?: string;
  /** Lille coral prik (notifikation) */
  dot?: boolean;
  size?: number;
}

export const IconButton = forwardRef<HTMLElement, IconButtonProps>(function IconButton({ icon, label, variant = 'plain', href, dot, size = 24, className, type = 'button', ...rest }, ref) {
  const cls = cx('rs-iconbtn', variant !== 'plain' && `rs-iconbtn--${variant}`, className);
  const inner = (
    <>
      <Icon name={icon} size={size} />
      {dot && <span className="rs-dot" />}
    </>
  );
  if (href !== undefined) {
    return <AppLink ref={ref as React.Ref<HTMLAnchorElement>} href={href} className={cls} aria-label={label}>{inner}</AppLink>;
  }
  return <button ref={ref as React.Ref<HTMLButtonElement>} type={type} className={cls} aria-label={label} {...rest}>{inner}</button>;
});
