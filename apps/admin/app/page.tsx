import { Notice, Text } from '@respin/ui';
import { PERMISSIONS, can } from '@respin/security';
import { AdminFrame } from '../components/AdminFrame';
import { requireStaff } from '../lib/auth';

export default async function Dashboard() {
  const staff = await requireStaff();
  return (
    <AdminFrame staff={staff} title="Oversigt">
      <Notice icon="shield">Du er logget ind som <b>{staff.email}</b> ({staff.role}). Alle handlinger logges i audit-loggen.</Notice>
      <Text variant="h3" style={{ margin: '24px 0 8px' }}>Dine rettigheder</Text>
      <Text variant="small" muted>{PERMISSIONS.filter((p) => can(staff.role, p)).join(' · ')}</Text>
    </AdminFrame>
  );
}
