import 'server-only';
import { and, eq, inArray, isNotNull, sql } from 'drizzle-orm';
import { schema, type Db } from '@respin/db';
import { computeBadges, type BadgeState } from '@respin/core/badges';

const { users, listings, sellerProfiles, mfaTotp, webauthnCredentials, analyticsEvents } = schema;

/** Badges for én bruger – beregnet ud fra annoncer, salg, sikkerhed, profil og visninger */
export async function badgesFor(db: Db, userId: string): Promise<BadgeState[]> {
  const [[u], [l], [cert], [totp], [keys], [views]] = await Promise.all([
    db.select({ createdAt: users.createdAt, username: users.username, bio: users.bio, banner: users.profileBanner }).from(users).where(eq(users.id, userId)),
    db.select({
      listings: sql<number>`count(*)`.mapWith(Number),
      sold: sql<number>`count(*) filter (where ${listings.status} = 'sold')`.mapWith(Number),
      categories: sql<number>`count(distinct ${listings.category})`.mapWith(Number)
    }).from(listings).where(and(eq(listings.sellerId, userId), inArray(listings.status, ['active', 'reserved', 'sold']))),
    db.select({ certified: sellerProfiles.certified }).from(sellerProfiles).where(eq(sellerProfiles.userId, userId)),
    db.select({ n: sql<number>`count(*)`.mapWith(Number) }).from(mfaTotp).where(and(eq(mfaTotp.userId, userId), isNotNull(mfaTotp.enabledAt))),
    db.select({ n: sql<number>`count(*)`.mapWith(Number) }).from(webauthnCredentials).where(eq(webauthnCredentials.userId, userId)),
    db.select({ top: sql<number>`coalesce(max(v.n), 0)`.mapWith(Number) }).from(sql`(
      select count(*)::int as n from ${analyticsEvents} ae join ${listings} l on l.id = ae.listing_id
      where l.seller_id = ${userId} and ae.type = 'listing_view' and ae.at > now() - interval '30 days' group by ae.listing_id) v`)
  ]);
  if (!u) return [];
  return computeBadges({
    listings: l?.listings ?? 0, sold: l?.sold ?? 0, categories: l?.categories ?? 0,
    certified: !!cert?.certified, secured: (totp?.n ?? 0) + (keys?.n ?? 0) > 0,
    profileComplete: !!(u.username && u.bio?.trim() && u.banner), topListingViews: views?.top ?? 0, memberSince: u.createdAt
  });
}
