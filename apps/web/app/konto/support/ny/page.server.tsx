import { Notice } from '@respin/ui';
import { AuthPage } from '../../../../components/AuthPage';
import { NewCaseForm } from '../../../../components/support/NewCaseForm';
import { requireSession } from '../../../../lib/auth';
import { getDb } from '../../../../lib/server';
import { ordersForSupport } from '../../../../lib/support';

export const metadata = { title: 'Ny henvendelse' };

export default async function NewCasePage() {
  const current = await requireSession('/konto/support/ny/');
  const orders = await ordersForSupport(getDb(), current.user.id);
  return (
    <AuthPage width="page" title="Skriv til kundeservice" crumbs={[{ label: 'Min konto', href: '/konto/' }, { label: 'Kundeservice', href: '/konto/support/' }, { label: 'Ny henvendelse' }]}>
      <Notice icon="shield">Vi spørger aldrig om din adgangskode, kode fra SMS eller kortoplysninger – heller ikke her.</Notice>
      <NewCaseForm orders={orders} />
    </AuthPage>
  );
}
