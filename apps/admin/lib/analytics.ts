import 'server-only';
/**
 * Statistik til admin ud fra analytics_events (uden cookies, uden IP – se hjemmesidens lib/analytics-server.ts).
 * "Besøgende" er unikke pr. dag (hashet skifter hver nat), så tal for en periode er summen af daglige besøgende.
 */
import { sql } from 'drizzle-orm';
import { schema, type Db } from '@respin/db';

const { analyticsEvents: e, listings, users } = schema;
export const PERIODS = [7, 30, 90] as const;
export type Period = (typeof PERIODS)[number];

const rowsOf = <T,>(r: unknown): T[] => (Array.isArray(r) ? r : (r as { rows: T[] }).rows) as T[];

export async function analytics(db: Db, days: Period) {
  const since = sql`now() - make_interval(days => ${days})`;
  const prev = sql`now() - make_interval(days => ${days * 2})`;
  const [totals, prevTotals, daily, pages, topListings, searches, zero, clicks, devices, referrers, cats, hours, funnel, growth] = await Promise.all([
    db.execute<{ pageviews: number; visitors: number; listing_views: number; searches: number; clicks: number; favorites: number; shares: number }>(sql`
      select count(*) filter (where type = 'pageview')::int as pageviews,
        (select coalesce(sum(n), 0)::int from (select count(distinct visitor) n from ${e} where at > ${since} and visitor is not null group by (at at time zone 'Europe/Copenhagen')::date) v) as visitors,
        count(*) filter (where type = 'listing_view')::int as listing_views, count(*) filter (where type = 'search')::int as searches,
        count(*) filter (where type = 'click')::int as clicks, coalesce(sum(num) filter (where type = 'favorite' and num > 0), 0)::int as favorites,
        count(*) filter (where type = 'share')::int as shares
      from ${e} where at > ${since}`),
    db.execute<{ pageviews: number; listing_views: number }>(sql`
      select count(*) filter (where type = 'pageview')::int as pageviews, count(*) filter (where type = 'listing_view')::int as listing_views
      from ${e} where at > ${prev} and at <= ${since}`),
    db.execute<{ day: string; pageviews: number; visitors: number; listing_views: number }>(sql`
      with d as (select generate_series((now() at time zone 'Europe/Copenhagen')::date - ${days - 1}::int, (now() at time zone 'Europe/Copenhagen')::date, interval '1 day')::date as day),
      ev as (select (at at time zone 'Europe/Copenhagen')::date as day, type, visitor from ${e} where at > ${since})
      select to_char(d.day, 'YYYY-MM-DD') as day,
        (select count(*)::int from ev where ev.day = d.day and ev.type = 'pageview') as pageviews,
        (select count(distinct visitor)::int from ev where ev.day = d.day and visitor is not null) as visitors,
        (select count(*)::int from ev where ev.day = d.day and ev.type = 'listing_view') as listing_views
      from d order by d.day`),
    db.execute<{ path: string; n: number; visitors: number }>(sql`
      select path, count(*)::int as n, count(distinct visitor)::int as visitors from ${e} where type = 'pageview' and at > ${since}
      group by path order by n desc limit 15`),
    db.execute<{ id: string; title: string | null; status: string | null; views: number; visitors: number; favorites: number; clicks: number }>(sql`
      select x.listing_id as id, l.title, l.status::text as status, x.views, x.visitors, x.favorites, x.clicks from (
        select listing_id, count(*) filter (where type = 'listing_view')::int as views, count(distinct visitor) filter (where type = 'listing_view')::int as visitors,
          coalesce(sum(num) filter (where type = 'favorite'), 0)::int as favorites, count(*) filter (where type = 'click')::int as clicks
        from ${e} where listing_id is not null and at > ${since} group by listing_id) x
      left join ${listings} l on l.id = x.listing_id order by x.views desc, x.clicks desc limit 15`),
    db.execute<{ q: string; n: number; results: number }>(sql`
      select lower(value) as q, count(*)::int as n, round(avg(num))::int as results from ${e}
      where type = 'search' and value is not null and at > ${since} group by lower(value) order by n desc limit 20`),
    db.execute<{ q: string; n: number }>(sql`
      select lower(value) as q, count(*)::int as n from ${e}
      where type = 'search' and value is not null and num = 0 and at > ${since} group by lower(value) order by n desc limit 15`),
    db.execute<{ target: string; n: number }>(sql`
      select value as target, count(*)::int as n from ${e} where type = 'click' and value is not null and at > ${since} group by value order by n desc limit 15`),
    db.execute<{ device: string; n: number }>(sql`
      select device, count(distinct coalesce(visitor, id::text))::int as n from ${e} where type = 'pageview' and at > ${since} group by device order by n desc`),
    db.execute<{ host: string | null; n: number }>(sql`
      select referrer_host as host, count(*)::int as n from ${e} where type = 'pageview' and at > ${since} group by referrer_host order by n desc limit 10`),
    db.execute<{ category: string; views: number; listing_views: number }>(sql`
      select c as category,
        (select count(*)::int from ${e} where type = 'pageview' and at > ${since} and path like '/kategori/' || c || '/%') as views,
        (select count(*)::int from ${e} where type = 'listing_view' and at > ${since} and category = c) as listing_views
      from unnest(array['kvinder','maend','boern','hjem','underholdning','kaeledyr']) as c`),
    db.execute<{ hour: number; n: number }>(sql`
      select extract(hour from at at time zone 'Europe/Copenhagen')::int as hour, count(*)::int as n from ${e}
      where type = 'pageview' and at > ${since} group by 1 order by 1`),
    db.execute<{ visitors: number; viewers: number; favoriters: number; sell_page: number; listings_created: number; signups: number }>(sql`
      select
        (select count(distinct visitor)::int from ${e} where at > ${since} and visitor is not null) as visitors,
        (select count(distinct visitor)::int from ${e} where at > ${since} and type = 'listing_view') as viewers,
        (select count(distinct visitor)::int from ${e} where at > ${since} and type = 'favorite' and num > 0) as favoriters,
        (select count(distinct visitor)::int from ${e} where at > ${since} and type = 'pageview' and path like '/saelg/%') as sell_page,
        (select count(*)::int from ${listings} where created_at > ${since}) as listings_created,
        (select count(*)::int from ${users} where created_at > ${since}) as signups`),
    db.execute<{ day: string; users: number; listings: number }>(sql`
      with d as (select generate_series((now() at time zone 'Europe/Copenhagen')::date - ${days - 1}::int, (now() at time zone 'Europe/Copenhagen')::date, interval '1 day')::date as day)
      select to_char(d.day, 'YYYY-MM-DD') as day,
        (select count(*)::int from ${users} u where (u.created_at at time zone 'Europe/Copenhagen')::date = d.day) as users,
        (select count(*)::int from ${listings} l where (l.created_at at time zone 'Europe/Copenhagen')::date = d.day) as listings
      from d order by d.day`)
  ]);
  const num = (v: unknown) => Number(v ?? 0);
  const t = rowsOf<Record<string, number>>(totals)[0] ?? {};
  const p = rowsOf<Record<string, number>>(prevTotals)[0] ?? {};
  const hourRows = rowsOf<{ hour: number; n: number }>(hours);
  return {
    days,
    totals: {
      pageviews: num(t.pageviews), visitors: num(t.visitors), listingViews: num(t.listing_views), searches: num(t.searches),
      clicks: num(t.clicks), favorites: num(t.favorites), shares: num(t.shares),
      prevPageviews: num(p.pageviews), prevListingViews: num(p.listing_views)
    },
    daily: rowsOf<{ day: string; pageviews: number; visitors: number; listing_views: number }>(daily).map((r) => ({ day: r.day, pageviews: num(r.pageviews), visitors: num(r.visitors), listingViews: num(r.listing_views) })),
    pages: rowsOf<{ path: string; n: number; visitors: number }>(pages).map((r) => ({ path: r.path, n: num(r.n), visitors: num(r.visitors) })),
    listings: rowsOf<{ id: string; title: string | null; status: string | null; views: number; visitors: number; favorites: number; clicks: number }>(topListings)
      .map((r) => ({ ...r, views: num(r.views), visitors: num(r.visitors), favorites: num(r.favorites), clicks: num(r.clicks) })),
    searches: rowsOf<{ q: string; n: number; results: number }>(searches).map((r) => ({ q: r.q, n: num(r.n), results: num(r.results) })),
    zeroResults: rowsOf<{ q: string; n: number }>(zero).map((r) => ({ q: r.q, n: num(r.n) })),
    clicks: rowsOf<{ target: string; n: number }>(clicks).map((r) => ({ target: r.target, n: num(r.n) })),
    devices: rowsOf<{ device: string; n: number }>(devices).map((r) => ({ device: r.device, n: num(r.n) })),
    referrers: rowsOf<{ host: string | null; n: number }>(referrers).map((r) => ({ host: r.host, n: num(r.n) })),
    categories: rowsOf<{ category: string; views: number; listing_views: number }>(cats).map((r) => ({ category: r.category, views: num(r.views), listingViews: num(r.listing_views) })),
    hours: Array.from({ length: 24 }, (_, h) => num(hourRows.find((r) => Number(r.hour) === h)?.n)),
    funnel: (() => { const f = rowsOf<Record<string, number>>(funnel)[0] ?? {}; return { visitors: num(f.visitors), viewers: num(f.viewers), favoriters: num(f.favoriters), sellPage: num(f.sell_page), listingsCreated: num(f.listings_created), signups: num(f.signups) }; })(),
    growth: rowsOf<{ day: string; users: number; listings: number }>(growth).map((r) => ({ day: r.day, users: num(r.users), listings: num(r.listings) }))
  };
}

/** Klikmål → læsbar tekst i admin */
export const CLICK_LABEL: Record<string, string> = {
  card: 'Varekort', hero_sell: 'Forside: "Sælg nu" i banneret', banner_sell: 'Forside: "Sælg nu"-banner', home_empty_sell: 'Forside: "Sæt en vare til salg" (tom)',
  home_category: 'Forside: kategori', nav_home: 'Bundmenu: Forside', nav_search: 'Bundmenu: Søg', nav_sell: 'Bundmenu: Sælg', nav_favorites: 'Bundmenu: Favoritter', nav_account: 'Bundmenu: Profil',
  mega_category: 'Megamenu: kategori', mega_sub: 'Megamenu: underkategori', mega_group: 'Megamenu: sektion', header_sell: 'Header: "Sælg nu"', buy_now: 'Annonce: "Køb nu"', offer: 'Annonce: "Giv bud"', message: 'Annonce: "Skriv til sælger"'
};
