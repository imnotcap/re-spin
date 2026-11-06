import { Notice } from '@respin/ui';
import { AdminFrame } from '../../components/AdminFrame';
import { requireStaff } from '../../lib/auth';

export default async function Page() {
  const staff = await requireStaff('report.handle');
  return (
    <AdminFrame staff={staff} title="Moderation">
      <Notice icon="info">Kø med anmeldte annoncer, brugere og beskeder (høj-risiko-beskeder fra assessMessageRisk). Kræver rettigheden <code>report.handle</code>.</Notice>
    </AdminFrame>
  );
}
