import { Notice } from '@respin/ui';
import { AdminFrame } from '../../components/AdminFrame';
import { requireStaff } from '../../lib/auth';

export default async function Page() {
  const staff = await requireStaff('audit.view');
  return (
    <AdminFrame staff={staff} title="Audit-log">
      <Notice icon="info">Søgbar, uforanderlig log over alle admin- og pengehandlinger. Kræver rettigheden <code>audit.view</code>.</Notice>
    </AdminFrame>
  );
}
