import Link from 'next/link';
import { Badge, EmptyState } from '@respin/ui';
import { AdminFrame, when } from '../../components/AdminFrame';
import { requireDb, requireStaff } from '../../lib/auth';
import { searchUsers } from '../../lib/people';

export const metadata = { title: 'Brugere' };

export default async function UsersPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const staff = await requireStaff('user.view');
  const q = ((await searchParams).q ?? '').slice(0, 100);
  const rows = await searchUsers(requireDb(), q);
  return (
    <AdminFrame staff={staff} title="Brugere" section="users">
      <form action="/users" className="flex gap-2" role="search">
        <label htmlFor="q" className="sr-only">Søg brugere</label>
        <input id="q" name="q" defaultValue={q} placeholder="Navn, e-mail, profilnavn eller id" className="h-10 w-80 max-w-full rounded-md border border-line bg-surface px-3 text-small" />
        <button className="h-10 rounded-md bg-forest px-4 text-small font-semibold text-white">Søg</button>
      </form>
      <div className="mt-4 overflow-hidden rounded-lg border border-line bg-surface">
        {rows.length === 0 ? <EmptyState icon="user" title="Ingen brugere" description="Prøv en anden søgning." className="py-12" /> : (
          <table className="w-full text-left text-small">
            <thead className="border-b border-line bg-sunken text-caption uppercase tracking-[0.06em] text-muted"><tr><th className="px-4 py-2.5 font-semibold">Bruger</th><th className="hidden px-4 py-2.5 font-semibold md:table-cell">Profil</th><th className="px-4 py-2.5 font-semibold">Status</th><th className="hidden px-4 py-2.5 text-right font-semibold md:table-cell">Oprettet</th></tr></thead>
            <tbody className="divide-y divide-line">
              {rows.map((u) => (
                <tr key={u.id} className="hover:bg-sunken">
                  <td className="max-w-0 px-4 py-3"><Link href={`/users/${u.id}`} className="block truncate font-semibold">{u.name}</Link><span className="block truncate text-caption text-muted">{u.email}</span></td>
                  <td className="hidden px-4 py-3 text-muted md:table-cell">{u.username ? `@${u.username}` : '–'}</td>
                  <td className="px-4 py-3"><span className="flex flex-wrap gap-1"><Badge tone={u.status === 'active' ? 'forest' : 'coral'}>{u.status === 'active' ? 'Aktiv' : u.status === 'suspended' ? 'Spærret' : 'Slettet'}</Badge>{!u.verified && <Badge tone="warn">Ikke bekræftet</Badge>}</span></td>
                  <td className="hidden whitespace-nowrap px-4 py-3 text-right text-muted md:table-cell">{when(u.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </AdminFrame>
  );
}
