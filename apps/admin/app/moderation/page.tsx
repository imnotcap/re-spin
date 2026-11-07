import { EmptyState } from '@respin/ui';
import { can } from '@respin/security';
import { AdminFrame, Panel, ago, kr } from '../../components/AdminFrame';
import { requireDb, requireStaff } from '../../lib/auth';
import { moderateAction, reportAction } from '../../lib/actions';
import { openReports, pendingListings } from '../../lib/people';

export const metadata = { title: 'Moderation' };

const TARGET: Record<string, string> = { listing: 'Annonce', user: 'Bruger', message: 'Besked' };

export default async function ModerationPage() {
  const staff = await requireStaff('report.handle');
  const db = requireDb();
  const [listings, reports] = await Promise.all([pendingListings(db), openReports(db)]);
  const canModerate = can(staff.role, 'listing.moderate');
  return (
    <AdminFrame staff={staff} title="Moderation" section="moderation">
      <div className="grid gap-5 xl:grid-cols-2">
        <Panel title={`Annoncer til gennemgang (${listings.length})`} pad={listings.length === 0}>
          {listings.length === 0 ? <EmptyState icon="check" title="Ingen annoncer venter" description="Annoncer, der nævner betaling uden om re:spin, telefonnumre eller links, havner her." className="py-6" /> : (
            <ul className="divide-y divide-line">
              {listings.map((l) => (
                <li key={l.id} className="p-5">
                  <p className="font-semibold">{l.title} <span className="font-normal text-muted">· {kr(l.priceOre)}</span></p>
                  <p className="text-caption text-muted">{l.sellerName} ({l.sellerEmail}) · {ago(l.createdAt)}</p>
                  {l.description && <p className="mt-2 line-clamp-4 whitespace-pre-line rounded-md bg-sunken p-3 text-small">{l.description}</p>}
                  {canModerate && (
                    <form action={moderateAction} className="mt-3 flex gap-2">
                      <input type="hidden" name="listingId" value={l.id} />
                      <button name="decision" value="approved" className="h-9 rounded-md bg-forest px-4 text-small font-semibold text-white">Godkend</button>
                      <button name="decision" value="rejected" className="h-9 rounded-md border border-line px-4 text-small font-semibold hover:border-ink">Afvis</button>
                    </form>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Panel>
        <Panel title={`Anmeldelser fra brugere (${reports.length})`} pad={reports.length === 0}>
          {reports.length === 0 ? <EmptyState icon="flag" title="Ingen åbne anmeldelser" description="Når brugere anmelder en annonce, bruger eller besked, kommer det her." className="py-6" /> : (
            <ul className="divide-y divide-line">
              {reports.map((r) => (
                <li key={r.id} className="p-5">
                  <p className="font-semibold">{TARGET[r.targetType] ?? r.targetType} <span className="font-mono text-caption font-normal text-muted">{r.targetId.slice(0, 8)}</span></p>
                  <p className="text-caption text-muted">Anmeldt af {r.reporter ?? 'slettet bruger'} · {ago(r.createdAt)}</p>
                  <p className="mt-2 text-small">“{r.reason}”</p>
                  <form action={reportAction} className="mt-3 flex gap-2">
                    <input type="hidden" name="reportId" value={r.id} />
                    <button name="decision" value="actioned" className="h-9 rounded-md bg-forest px-4 text-small font-semibold text-white">Handlet</button>
                    <button name="decision" value="dismissed" className="h-9 rounded-md border border-line px-4 text-small font-semibold hover:border-ink">Afvis</button>
                  </form>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </AdminFrame>
  );
}
