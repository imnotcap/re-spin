'use client';

import Link from 'next/link';
import { forwardRef, type ComponentProps } from 'react';

/**
 * next/link, men forsiden forhåndshentes ikke. Forsidens banner har fetchpriority="high" (hurtig LCP), og React
 * lægger så et preload-hint i sidens data. Blev forsiden forhåndshentet fra alle andre sider, ville banneret
 * blive hentet overalt – unødig trafik og en advarsel i konsollen. Et klik på "Forside" henter den bare ved klik.
 */
export const SiteLink = forwardRef<HTMLAnchorElement, ComponentProps<typeof Link>>(function SiteLink({ prefetch, ...props }, ref) {
  return <Link ref={ref} prefetch={props.href === '/' ? false : prefetch} {...props} />;
});
