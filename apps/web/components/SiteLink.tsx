'use client';

import Link from 'next/link';
import { forwardRef, type ComponentProps } from 'react';
import { BASE_PATH } from '../lib/site';

/**
 * next/link med to undtagelser:
 *  - Forsiden forhåndshentes ikke. Banneret har fetchpriority="high", og React lægger et preload-hint i sidens
 *    data; blev forsiden forhåndshentet fra alle sider, blev banneret hentet overalt.
 *  - Profiler (/@/<navn>) er almindelige links: adressen er en omskrivning af /profil/<navn>/, som Next' egen
 *    navigation i browseren ikke kender i den statiske udgave.
 */
export const SiteLink = forwardRef<HTMLAnchorElement, ComponentProps<typeof Link>>(function SiteLink({ prefetch, ...props }, ref) {
  if (typeof props.href === 'string' && props.href.startsWith('/@/')) {
    const { href, replace: _r, scroll: _s, shallow: _sh, locale: _l, onNavigate: _n, ...rest } = props as ComponentProps<typeof Link> & { href: string };
    return <a ref={ref} href={`${BASE_PATH}${href}`} {...(rest as React.AnchorHTMLAttributes<HTMLAnchorElement>)} />;
  }
  return <Link ref={ref} prefetch={props.href === '/' ? false : prefetch} {...props} />;
});
