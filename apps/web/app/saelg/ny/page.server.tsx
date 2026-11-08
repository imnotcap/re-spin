import Link from 'next/link';
import { eq } from 'drizzle-orm';
import { schema } from '@respin/db';
import { AuthPage, linkCls } from '../../../components/AuthPage';
import { ListingForm } from '../../../components/listings/ListingForm';
import { requireSession } from '../../../lib/auth';
import { getDb } from '../../../lib/server';
import { T } from '../../../lib/i18n/client';

export const metadata = { title: 'Sæt en vare til salg' };

export default async function NewListingPage() {
  const current = await requireSession('/saelg/ny/');
  const [profile] = await getDb().select({ certified: schema.sellerProfiles.certified }).from(schema.sellerProfiles).where(eq(schema.sellerProfiles.userId, current.user.id));
  return (
    <AuthPage width="page" title="Sæt en vare til salg" crumbs={[{ label: <T k="crumb.home" />, href: '/' }, { label: 'Sælg', href: '/saelg/' }, { label: 'Ny annonce' }]}
      intro={<>Det er gratis at sætte til salg, og du får hele salgsprisen – 0 % i kommission. <Link href="/saadan-virker-det/#gebyrer" className={linkCls}>Se gebyrerne</Link>.</>}>
      <ListingForm certified={!!profile?.certified} />
    </AuthPage>
  );
}
