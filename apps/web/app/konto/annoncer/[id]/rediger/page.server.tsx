import { notFound } from 'next/navigation';
import { AuthPage } from '../../../../../components/AuthPage';
import { ListingForm } from '../../../../../components/listings/ListingForm';
import { requireSession } from '../../../../../lib/auth';
import { getDb } from '../../../../../lib/server';
import { getOwnListingForEdit } from '../../../../../lib/listings';

export const metadata = { title: 'Redigér annonce' };

export default async function EditListingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const current = await requireSession(`/konto/annoncer/`);
  const l = await getOwnListingForEdit(getDb(), current.user.id, id);
  if (!l) notFound(); // også når annoncen tilhører en anden – samme svar som "findes ikke"
  const kr = (l.priceOre / 100).toLocaleString('da-DK', { minimumFractionDigits: l.priceOre % 100 ? 2 : 0, useGrouping: false });
  return (
    <AuthPage width="page" title="Redigér annonce" crumbs={[{ label: 'Min konto', href: '/konto/' }, { label: 'Mine annoncer', href: '/konto/annoncer/' }, { label: l.title }]}>
      <ListingForm initial={{ id: l.id, title: l.title, description: l.description, category: l.category, subcategory: l.subcategory ?? '', brand: l.brand ?? '', size: l.size ?? '', condition: l.condition, price: kr, shippingSize: l.shippingSize }} />
    </AuthPage>
  );
}
