import type { MetadataRoute } from 'next';
import { CATEGORIES } from '../lib/catalog';
import { SITE_URL } from '../lib/site';
import { profilePath } from '../lib/profile-url';
import { getDb } from '../lib/server';
import { sitemapEntries } from '../lib/listings';

/** Genberegnes højst én gang i timen */
export const revalidate = 3600;

/** Alle offentlige sider (med afsluttende skråstreg som resten af siden): faste sider, annoncer og profiler */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const u = (p: string, priority: number, changeFrequency: 'daily' | 'weekly' | 'monthly' = 'weekly', lastModified?: Date) =>
    ({ url: `${SITE_URL}${p}`, priority, changeFrequency, ...(lastModified ? { lastModified } : {}) });
  // Under build (uden database) kun de faste sider; annoncer og profiler kommer med ved næste opdatering
  const live = await (async () => sitemapEntries(getDb()))().catch(() => ({ listings: [] as Array<{ id: string; updatedAt: Date }>, profiles: [] as string[] }));
  return [
    u('/', 1, 'daily'),
    ...CATEGORIES.map((c) => u(`/kategori/${c.slug}/`, 0.9, 'daily')),
    ...live.listings.map((l) => u(`/annonce/${l.id}/`, 0.7, 'weekly', l.updatedAt)),
    ...live.profiles.map((name) => u(profilePath(name), 0.5)),
    ...['/saelg/', '/saadan-virker-det/', '/sikkerhed/'].map((p) => u(p, 0.6, 'monthly')),
    ...['/om/', '/privatliv/', '/cookiepolitik/', '/vilkaar/'].map((p) => u(p, 0.3, 'monthly')),
    u('/maerker/', 0.5, 'weekly')
  ];
}
