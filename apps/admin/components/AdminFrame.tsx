import { Badge, List, ListRow, Text } from '@respin/ui';
import { ADMIN_ROUTE_PERMISSIONS, can } from '@respin/security';
import type { Staff } from '../lib/auth';

const LABELS: Record<string, string> = { '/users': 'Brugere', '/listings': 'Annoncer', '/moderation': 'Moderation', '/orders': 'Ordrer', '/payouts': 'Udbetalinger', '/ledger': 'Bogholderi', '/settings/fees': 'Gebyrer', '/staff': 'Medarbejdere', '/audit': 'Audit-log' };
const BUILT = new Set(['/moderation', '/orders', '/users', '/settings/fees', '/audit']);

/** Ramme om alle admin-sider. Viser kun de menupunkter medarbejderens rolle har adgang til. */
export function AdminFrame({ staff, title, children }: { staff: Staff; title: string; children: React.ReactNode }) {
  const nav = ADMIN_ROUTE_PERMISSIONS.filter(([path, perm]) => can(staff.role, perm) && BUILT.has(path));
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', minHeight: '100dvh', background: 'var(--rs-bg)', color: 'var(--rs-text)', fontFamily: 'var(--rs-font)' }}>
      <aside style={{ borderRight: '1px solid var(--rs-border)', padding: 16 }}>
        <Text variant="h3">re:spin admin</Text>
        <div style={{ margin: '8px 0 16px' }}><Badge tone="forest">{staff.role}</Badge></div>
        <List style={{ margin: 0 }}>
          <ListRow href="/" title="Oversigt" chevron={false} />
          {nav.map(([path]) => <ListRow key={path} href={path} title={LABELS[path] ?? path} chevron={false} />)}
        </List>
        <Text variant="caption" muted style={{ display: 'block', marginTop: 16 }}>{staff.email}</Text>
      </aside>
      <main style={{ padding: 24 }}>
        <Text variant="h1">{title}</Text>
        <div style={{ marginTop: 16 }}>{children}</div>
      </main>
    </div>
  );
}
