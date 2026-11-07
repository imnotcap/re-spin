import { Notice } from '@respin/ui';
import { AdminFrame } from '../../../components/AdminFrame';
import { requireStaff } from '../../../lib/auth';

export const metadata = { title: 'Gebyrer' };

export default async function Page() {
  const staff = await requireStaff('fees.edit');
  return (
    <AdminFrame staff={staff} title="Gebyrer" section="fees">
      <Notice icon="info">Gebyrerne ligger i koden (packages/core/src/fees.ts) og fastfryses på hver ordre ved oprettelse. Ændringer her kommer senere og vil kræve to personer (fire-øjne).</Notice>
    </AdminFrame>
  );
}
