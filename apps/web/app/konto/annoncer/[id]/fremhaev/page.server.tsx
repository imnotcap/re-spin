import { notFound } from 'next/navigation';
import { Notice } from '@respin/ui';
import { AuthPage } from '../../../../../components/AuthPage';
import { PromoteForm } from '../../../../../components/listings/PromoteForm';
import { requireSession } from '../../../../../lib/auth';
import { getDb, getStripeGatewayOrNull } from '../../../../../lib/server';
import { getOwnListingForEdit } from '../../../../../lib/listings';
import { activePromotions, isCertified } from '../../../../../lib/promotions';

export const metadata = { title: 'Fremhæv annonce', robots: { index: false } };

const fmt = (d: Date) => d.toLocaleString('da-DK', { dateStyle: 'long', timeStyle: 'short', timeZone: 'Europe/Copenhagen' });

export default async function PromotePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ annulleret?: string }> }) {
  const { id } = await params;
  const current = await requireSession('/konto/annoncer/');
  const l = await getOwnListingForEdit(getDb(), current.user.id, id);
  if (!l) notFound();
  const sp = await searchParams;
  const until = (await activePromotions(getDb(), [l.id])).get(l.id);
  const certified = await isCertified(getDb(), current.user.id);
  const canPromote = l.status === 'active' && l.moderationStatus === 'approved';
  const testMode = !getStripeGatewayOrNull() && (process.env.NODE_ENV !== 'production' || process.env.PROMOTIONS_TEST_MODE === '1');
  return (
    <AuthPage width="page" title="Fremhæv annonce" crumbs={[{ label: 'Min konto', href: '/konto/' }, { label: 'Mine annoncer', href: '/konto/annoncer/' }, { label: l.title }]}
      intro={<>Få <b>{l.title}</b> vist øverst på forsiden, i kategorien og i søgningen – med mærket «Fremhævet».</>}>
      {sp.annulleret && <Notice icon="info" role="status">Betalingen blev afbrudt. Der er ikke trukket noget.</Notice>}
      {until && <Notice icon="check" role="status">Annoncen er fremhævet til {fmt(until)}.</Notice>}
      {canPromote
        ? <PromoteForm listingId={l.id} certified={certified} testMode={testMode} />
        : <Notice icon="info" warn>Kun aktive annoncer, der er godkendt, kan fremhæves.</Notice>}
    </AuthPage>
  );
}
