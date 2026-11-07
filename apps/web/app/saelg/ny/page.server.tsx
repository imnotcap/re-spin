import Link from 'next/link';
import { eq } from 'drizzle-orm';
import { schema } from '@respin/db';
import { AuthPage, linkCls } from '../../../components/AuthPage';
import { ListingForm } from '../../../components/listings/ListingForm';
import { requireSession } from '../../../lib/auth';
import { getDb } from '../../../lib/server';

export const metadata = { title: 'Sæt en vare til salg' };

export default async function NewListingPage() {
  const current = await requireSession('/saelg/ny/');
  const [profile] = await getDb().select({ certified: schema.sellerProfiles.certified }).from(schema.sellerProfiles).where(eq(schema.sellerProfiles.userId, current.user.id));
  return (
    <AuthPage width="page" title="Sæt en vare til salg" crumbs={[{ label: 'Forside', href: '/' }, { label: 'Sælg', href: '/saelg/' }, { label: 'Ny annonce' }]}
      intro={<>Det er gratis at sætte til salg. Du betaler først et lille gebyr, når varen er solgt. <Link href="/gebyrer/" className={linkCls}>Se gebyrerne</Link></>}>
      <ListingForm certified={!!profile?.certified} />
    </AuthPage>
  );
}
