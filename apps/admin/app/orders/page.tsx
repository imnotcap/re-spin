import { Notice } from '@respin/ui';
import { AdminFrame } from '../../components/AdminFrame';
import { requireStaff } from '../../lib/auth';

export default async function Page() {
  const staff = await requireStaff('order.view');
  return (
    <AdminFrame staff={staff} title="Ordrer">
      <Notice icon="info">Søg og se ordrer med tidslinje. Refundering og tvistafgørelse kræver fire-øjne ved store beløb. Kræver rettigheden <code>order.view</code>.</Notice>
    </AdminFrame>
  );
}
