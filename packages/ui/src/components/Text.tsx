import type { ElementType, HTMLAttributes } from 'react';
import { cx } from '../utils';

export type TextVariant = 'display' | 'h1' | 'h2' | 'h3' | 'body' | 'small' | 'caption';

const DEFAULT_TAG: Record<TextVariant, ElementType> = { display: 'h1', h1: 'h1', h2: 'h2', h3: 'h3', body: 'p', small: 'p', caption: 'span' };

export interface TextProps extends HTMLAttributes<HTMLElement> {
  variant?: TextVariant;
  /** Overstyr HTML-elementet (semantik uafhængig af udseende) */
  as?: ElementType;
  muted?: boolean;
  bold?: boolean;
  center?: boolean;
}

/** Typografi-skalaen: display / h1 / h2 / h3 / body / small / caption */
export function Text({ variant = 'body', as, muted, bold, center, className, ...rest }: TextProps) {
  const Tag = as ?? DEFAULT_TAG[variant];
  return <Tag className={cx(`rs-t-${variant}`, muted && 'rs-t-muted', bold && 'rs-t-bold', center && 'rs-t-center', className)} {...rest} />;
}
