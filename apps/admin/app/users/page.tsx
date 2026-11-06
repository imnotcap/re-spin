import { Notice } from '@respin/ui';
import { AdminFrame } from '../../components/AdminFrame';
import { requireStaff } from '../../lib/auth';

export default async function Page() {
  const staff = await requireStaff('user.view');
  return (
    <AdminFrame staff={staff} title="Brugere">
      <Notice icon="info">Se brugere, spær konti, se sælger-KYC og certificering. Kræver rettigheden <code>user.view</code>.</Notice>
    </AdminFrame>
  );
}
