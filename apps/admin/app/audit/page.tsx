import { AdminFrame } from '../../components/AdminFrame';
import { requireDb, requireStaff } from '../../lib/auth';
import { auditEntries } from '../../lib/people';

export const metadata = { title: 'Audit-log' };

const time = (d: Date) => d.toLocaleString('da-DK', { dateStyle: 'short', timeStyle: 'medium', timeZone: 'Europe/Copenhagen' });

export default async function AuditPage({ searchParams }: { searchParams: Promise<{ action?: string }> }) {
  const staff = await requireStaff('audit.view');
  const action = ((await searchParams).action ?? '').slice(0, 60);
  const rows = await auditEntries(requireDb(), { action: action || undefined });
  return (
    <AdminFrame staff={staff} title="Audit-log" section="audit">
      <form action="/audit" className="flex gap-2" role="search">
        <label htmlFor="action" className="sr-only">Handling</label>
        <input id="action" name="action" defaultValue={action} placeholder="Handling, fx order. eller support." className="h-10 w-72 rounded-md border border-line bg-surface px-3 text-small" />
        <button className="h-10 rounded-md bg-forest px-4 text-small font-semibold text-white">Filtrér</button>
      </form>
      <p className="mt-2 text-caption text-muted">Loggen kan ikke ændres eller slettes – heller ikke af administratorer. Viser de seneste 200.</p>
      <div className="mt-4 overflow-x-auto rounded-lg border border-line bg-surface">
        <table className="w-full text-left text-small">
          <thead className="border-b border-line bg-sunken text-caption uppercase tracking-[0.06em] text-muted"><tr><th className="px-4 py-2.5 font-semibold">Tid</th><th className="px-4 py-2.5 font-semibold">Hvem</th><th className="px-4 py-2.5 font-semibold">Handling</th><th className="px-4 py-2.5 font-semibold">Mål</th><th className="px-4 py-2.5 font-semibold">IP</th></tr></thead>
          <tbody className="divide-y divide-line">
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="whitespace-nowrap px-4 py-2 tabular-nums text-muted">{time(r.createdAt)}</td>
                <td className="px-4 py-2">{r.actor ?? (r.actorType === 'staff' ? r.actorId : r.actorType)}</td>
                <td className="px-4 py-2 font-mono text-caption">{r.action}</td>
                <td className="px-4 py-2 font-mono text-caption text-muted">{r.targetType ? `${r.targetType}:${(r.targetId ?? '').slice(0, 8)}` : '–'}</td>
                <td className="px-4 py-2 font-mono text-caption text-muted">{r.ip ?? '–'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminFrame>
  );
}
