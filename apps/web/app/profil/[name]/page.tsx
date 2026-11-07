import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Breadcrumbs, ProductGrid } from '@respin/ui';
import { MemberProfile, memberMetadata } from '@respin-live';
import { ItemCard } from '../../../components/ItemCard';
import { ProfileHeader, ProfileTabs, ReviewsPanel } from '../../../components/profile/ProfileView';
import { SELLERS, itemsBySeller, newest, toCard } from '../../../lib/catalog';
import { bannerById } from '../../../lib/banners';
import { ratingDistribution, reviewsFor } from '../../../lib/reviews';
import { profilePath } from '../../../lib/profile-url';
import { T } from '../../../lib/i18n/client';

/** Testversionens sælgere er forudrenderet; i server-bygget slås medlemmer op i databasen (MemberProfile) */
export const generateStaticParams = () => SELLERS.map((s) => ({ name: s.name }));

type Props = { params: Promise<{ name: string }> };
const sellerByName = (name: string) => SELLERS.find((s) => s.name === decodeURIComponent(name).toLowerCase());

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { name } = await params;
  const s = sellerByName(name);
  if (!s) return memberMetadata(decodeURIComponent(name));
  return { title: `${s.name} – profil`, description: `${s.name} fra ${s.city} sælger brugt tøj og ting på re:spin. ${s.reviews} anmeldelser, ${s.rating.toLocaleString('da-DK')} i vurdering.`, alternates: { canonical: profilePath(s.name) } };
}

export default async function ProfilePage({ params }: Props) {
  const { name } = await params;
  const s = sellerByName(name);
  if (!s) {
    const member = await MemberProfile({ name: decodeURIComponent(name) });
    if (!member) notFound();
    return member;
  }
  const ids = new Set(itemsBySeller(s.id).map((i) => i.id));
  const items = newest().filter((i) => ids.has(i.id));
  const reviews = reviewsFor(s);

  return (
    <div className="mx-auto max-w-7xl px-4 pt-5 sm:px-6">
      <Breadcrumbs items={[{ label: <T k="crumb.home" />, href: '/' }, { label: s.name }]} />
      <ProfileHeader
        name={s.name} handle={s.name} banner={bannerById(s.banner)} certified={s.certified} rating={s.rating} reviews={s.reviews}
        sharePath={profilePath(s.name)} bio={s.bio}
        facts={[
          { icon: 'package', label: <T k="profile.sold" />, value: s.sold.toLocaleString('da-DK') },
          { icon: 'clock', label: <T k="profile.responds" />, value: <T k={`responds.${s.responds}`} fallback={s.responds} /> },
          { icon: 'pin', label: <T k="profile.city" />, value: s.city },
          { icon: 'user', label: <T k="profile.memberSince" />, value: s.memberSince }
        ]}
      />
      <ProfileTabs tabs={[
        { id: 'til-salg', label: <T k="profile.forSale" />, count: items.length, panel: items.length
          ? <ProductGrid layout="responsive">{items.map((i) => <ItemCard key={i.id} item={toCard(i)} />)}</ProductGrid>
          : <p className="text-body text-muted"><T k="profile.noItems" /></p> },
        { id: 'anmeldelser', label: <T k="profile.reviews" />, count: s.reviews, panel: <ReviewsPanel name={s.name} rating={s.rating} count={s.reviews} distribution={ratingDistribution(s.rating, s.reviews)} reviews={reviews} /> }
      ]} />
    </div>
  );
}
