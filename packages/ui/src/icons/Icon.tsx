import type { SVGProps } from 'react';
import { cx } from '../utils';
import { ICON_PATHS, type IconName } from './paths';

export interface IconProps extends Omit<SVGProps<SVGSVGElement>, 'name' | 'children'> {
  name: IconName;
  /** Pixel-størrelse (default 24) */
  size?: number;
}

/** Videro-ikon. Dekorativt som standard; giv `aria-label` for at gøre det meningsfuldt. */
export function Icon({ name, size = 24, className, 'aria-label': ariaLabel, ...rest }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cx('rs-icon', className)}
      aria-hidden={ariaLabel ? undefined : true}
      aria-label={ariaLabel}
      role={ariaLabel ? 'img' : undefined}
      dangerouslySetInnerHTML={{ __html: ICON_PATHS[name] }}
      {...rest}
    />
  );
}
