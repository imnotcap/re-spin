import Link from 'next/link';
import { Notice } from '@respin/ui';
import { AuthPage, linkCls } from '../../../components/AuthPage';
import { PromoteForm } from '../../../components/listings/PromoteForm';
import { requireSession } from '../../../lib/auth';
import { getDb, getStripeGatewayOrNull } from '../../../lib/server';
import { activeProfilePromotion, isCertified } from '../../../lib/promotions';
import { ownListingIds } from '../../../lib/listings';

export const metadata = { title: 'Fremhæv din profil', robots: { index: false } };

const fmt = (d: Date) => d.toLocaleString('da-DK', { dateStyle: 'long', timeStyle: 'short', timeZone: 'Europe/Copenhagen' });

/** Køb fremhævning af profilen: sælgeren vises under «Fremhævede sælgere» på forsiden med sine nyeste varer. */
export default async function PromoteProfilePage({ searchParams }: { searchParams: Promise<{ annulleret?: string }> }) {
  const current = await requireSession('/konto/fremhaev-profil/');
  const db = getDb();
  const [until, certified, ids, sp] = await Promise.all([activeProfilePromotion(db, current.user.id), isCertified(db, current.user.id), ownListingIds(db, current.user.id), searchParams]);
  const testMode = !getStripeGatewayOrNull() && (process.env.NODE_ENV !== 'production' || process.env.PROMOTIONS_TEST_MODE === '1');
  return (
    <AuthPage width="page" title="Fremhæv din profil" crumbs={[{ label: 'Min konto', href: '/konto/' }, { label: 'Fremhæv profil' }]}
      intro={<>Bliv vist under <b>Fremhævede sælgere</b> på forsiden med dine nyeste varer – så flere finder hele din butik, ikke kun én annonce.</>}>
      {sp.annulleret && <Notice icon="info" role="status">Betalingen blev afbrudt. Der er ikke trukket noget.</Notice>}
      {until && <Notice icon="check" role="status">Din profil er fremhævet til {fmt(until)}.</Notice>}
      {ids.length > 0
        ? <PromoteForm kind="profile" certified={certified} testMode={testMode} />
        : <Notice icon="info" warn>Du skal have mindst én vare til salg, før du kan fremhæve din profil. <Link href="/saelg/ny/" className={linkCls}>Sæt en vare til salg</Link></Notice>}
    </AuthPage>
  );
}
