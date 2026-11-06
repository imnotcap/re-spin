'use client';

import { usePathname } from 'next/navigation';
import { RESPIN_TABS } from '@respin/ui/utils';
import { TabBar } from '@respin/ui';

/** Aktiv fane udledes af URL'en. Hrefs peger på /demo-ruterne. */
const items = [
  { ...RESPIN_TABS.items[0]!, href: '/demo' },
  { ...RESPIN_TABS.items[1]!, href: '/demo' },
  { ...RESPIN_TABS.items[2]!, href: '/demo/messages', badge: 2 },
  { ...RESPIN_TABS.items[3]!, href: '/demo' }
];

export function DemoTabBar() {
  const path = usePathname();
  const activeId = path.startsWith('/demo/messages') ? 'messages' : path === '/demo' ? 'home' : undefined;
  return <TabBar items={items} fab={{ ...RESPIN_TABS.fab, href: '/demo/sell' }} activeId={activeId} />;
}
