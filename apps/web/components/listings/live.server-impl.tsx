import 'server-only';
import { ProductGrid, SectionHeader } from '@respin/ui';
import { ItemCard } from '../ItemCard';
import { getDb } from '../../lib/server';
import { getImageStore } from '../../lib/image-store';
import { listFeed } from '../../lib/listings';
import { listingToCard } from '../../lib/listing-card';
import type { Metadata } from 'next';
import type { LiveSectionProps } from './live';
import { memberByUsername } from '../../lib/profile';
import { bannerById } from '../../lib/banners';
import { profilePath } from '../../lib/profile-url';
import { ProfileHeader, ProfileTabs, ReviewsPanel } from '../profile/ProfileView';
import { Breadcrumbs } from '@respin/ui';
import { T } from '../../lib/i18n/client';
import { pageMetadata } from '../../lib/seo';
export { LiveSearch } from './LiveSearch';

/** Server-renderet (ingen layout-skift): vises kun, når der findes annoncer. En databasefejl skjuler blot sektionen. */
export async function LiveSection({ title, category, limit = 12, id, className }: LiveSectionProps) {
  const items = await listFeed(getDb(), getImageStore(), { category: category as never, limit }).catch((e) => {
    console.error('feed-fejl', e instanceof Error ? e.message : 'ukendt');
    return [];
  });
  if (!items.length) return null;
  return (
    <section aria-labelledby={id} className={className}>
      <SectionHeader id={id} title={title} action={{ label: <T k="home.sellYourself" />, href: '/saelg/ny/' }} className="px-0" />
      <ProductGrid layout="responsive">{items.map((l) => <ItemCard key={l.id} item={listingToCard(l)} showSeller />)}</ProductGrid>
    </section>
  );
}

/** Medlemsprofil fra databasen: /@/<username> */
export async function MemberProfile({ name }: { name: string }) {
  const m = await memberByUsername(getDb(), name).catch(() => null);
  if (!m || !m.username) return null;
  const items = await listFeed(getDb(), getImageStore(), { sellerId: m.id, limit: 48 }).catch(() => []);
  return (
    <div className="mx-auto max-w-7xl px-4 pt-5 sm:px-6">
      <Breadcrumbs items={[{ label: <T k="crumb.home" />, href: '/' }, { label: m.displayName }]} />
      <ProfileHeader
        name={m.displayName} handle={m.username} banner={bannerById(m.banner)} sharePath={profilePath(m.username)}
        bio={m.bio ?? undefined}
        facts={[
          { icon: 'tag', label: <T k="profile.forSale" />, value: items.length },
          { icon: 'user', label: <T k="profile.memberSince" />, value: m.createdAt.getFullYear() },
          { icon: 'shield', label: <T k="profile.member" />, value: '✓' },
          { icon: 'star', label: <T k="profile.reviews" />, value: 0 }
        ]}
      />
      <ProfileTabs tabs={[
        { id: 'til-salg', label: <T k="profile.forSale" />, count: items.length, panel: items.length
          ? <ProductGrid layout="responsive">{items.map((l) => <ItemCard key={l.id} item={listingToCard(l)} />)}</ProductGrid>
          : <p className="text-body text-muted"><T k="profile.noItems" /></p> },
        { id: 'anmeldelser', label: <T k="profile.reviews" />, count: 0, panel: <ReviewsPanel name={m.displayName} rating={0} count={0} distribution={[0, 0, 0, 0, 0]} reviews={[]} /> }
      ]} />
    </div>
  );
}

export async function memberMetadata(name: string): Promise<Metadata> {
  const m = await memberByUsername(getDb(), name).catch(() => null);
  if (!m?.username) return { title: 'Profilen findes ikke', robots: { index: false } };
  const banner = bannerById(m.banner);
  return pageMetadata({
    title: `${m.displayName} (@${m.username}) – profil`,
    description: m.bio || `${m.displayName} sælger brugt tøj og ting på Videro. Se annoncerne, og køb med køberbeskyttelse.`,
    path: profilePath(m.username),
    images: banner.photo ? [{ url: banner.photo.src.replace('-800.webp', '-1600.webp'), width: 1600, height: 400, alt: `${m.displayName}s profilbanner` }] : undefined
  });
}
