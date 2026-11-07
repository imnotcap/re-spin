import type { MetadataRoute } from 'next';
import { CATEGORIES, ITEMS, SELLERS } from '../lib/catalog';
import { SITE_URL } from '../lib/site';
import { profilePath } from '../lib/profile-url';

export const dynamic = 'force-static';

/** Alle offentlige sider (med afsluttende skråstreg som resten af siden) */
export default function sitemap(): MetadataRoute.Sitemap {
  const u = (p: string, priority: number, changeFrequency: 'daily' | 'weekly' | 'monthly' = 'weekly') => ({ url: `${SITE_URL}${p}`, priority, changeFrequency });
  return [
    u('/', 1, 'daily'),
    ...CATEGORIES.map((c) => u(`/kategori/${c.slug}/`, 0.9, 'daily')),
    ...ITEMS.map((i) => u(`/vare/${i.id}/`, 0.7)),
    ...SELLERS.map((s) => u(profilePath(s.name), 0.5)),
    ...['/saelg/', '/saadan-virker-det/', '/sikkerhed/', '/gebyrer/'].map((p) => u(p, 0.6, 'monthly')),
    ...['/om/', '/privatliv/', '/cookiepolitik/', '/vilkaar/'].map((p) => u(p, 0.3, 'monthly'))
  ];
}
