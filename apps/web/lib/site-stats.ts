import 'server-only';
import { unstable_cache } from 'next/cache';
import { getDb } from './server';
import { getImageStore } from './image-store';
import { siteStats, type SiteStats } from './listings';
import { menuMetaFrom, type MenuMeta } from './catalog';

/** Tal til menu, forside og mærkesiden. Gemmes et minut, så ikke hver sidevisning spørger databasen. */
const cached = unstable_cache(async (): Promise<SiteStats> => siteStats(getDb(), getImageStore()), ['site-stats-v1'], { revalidate: 60, tags: ['listings'] });

const EMPTY: SiteStats = { cats: {}, brands: [], total: 0 };

export async function getSiteStats(): Promise<SiteStats> {
  return cached().catch((e) => {
    console.error('stats-fejl', e instanceof Error ? e.message : 'ukendt');
    return EMPTY;
  });
}

export async function getMenuMeta(): Promise<MenuMeta> {
  return menuMetaFrom(await getSiteStats());
}
