import { Notice } from '@respin/ui';
import { AdminFrame } from '../../../components/AdminFrame';
import { requireStaff } from '../../../lib/auth';

export default async function Page() {
  const staff = await requireStaff('fees.edit');
  return (
    <AdminFrame staff={staff} title="Gebyrer">
      <Notice icon="info">Ændring af gebyrer kræver to personer (fire-øjne). Gebyrer fastfryses på hver ordre ved oprettelse. Kræver rettigheden <code>fees.edit</code>.</Notice>
    </AdminFrame>
  );
}
