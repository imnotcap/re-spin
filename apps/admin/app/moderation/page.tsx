import Link from 'next/link';
import { Badge, EmptyState, Notice } from '@respin/ui';
import { can } from '@respin/security';
import { AdminFrame, Panel, ago, kr } from '../../components/AdminFrame';
import { requireDb, requireStaff } from '../../lib/auth';
import { listingAction, reportAction } from '../../lib/actions';
import { STATUS_LABEL, categoryLabel, openReportsDetailed, pendingWithImages } from '../../lib/listings';

export const metadata = { title: 'Moderation' };

const TARGET: Record<string, string> = { listing: 'Annonce', user: 'Bruger', message: 'Besked' };
const REASON: Record<string, string> = { forbidden: 'Forbudt vare', scam: 'Svindel / betaling udenom', misleading: 'Vildledende', offensive: 'Stødende', wrong_category: 'Forkert kategori', other: 'Andet' };
const btn = 'h-9 rounded-md px-3 text-small font-semibold';

/** "scam: tekst" → { label: "Svindel …", text: "tekst" } */
const parseReason = (r: string) => { const m = /^([a-z_]+)(?::\s*(.*))?$/s.exec(r); return m && REASON[m[1]!] ? { label: REASON[m[1]!]!, text: m[2] ?? '' } : { label: '', text: r }; };

export default async function ModerationPage({ searchParams }: { searchParams: Promise<{ ok?: string; fejl?: string }> }) {
  const staff = await requireStaff('report.handle');
  const sp = await searchParams;
  const db = requireDb();
  const [pending, reports] = await Promise.all([pendingWithImages(db), openReportsDetailed(db)]);
  const canModerate = can(staff.role, 'listing.moderate');
  return (
    <AdminFrame staff={staff} title="Moderation" section="moderation" actions={<Link href="/listings?anmeldt=1" className="text-small font-semibold text-forest underline underline-offset-4">Alle anmeldte annoncer</Link>}>
      {sp.ok && <Notice icon="check" role="status" className="mb-4">Gemt.</Notice>}
      <div className="grid gap-5 xl:grid-cols-2">
        <Panel title={`Annoncer til gennemgang (${pending.length})`} pad={pending.length === 0}>
          {pending.length === 0 ? <EmptyState icon="check" title="Ingen annoncer venter" description="Annoncer, der nævner betaling uden om Videro, telefonnumre eller links – eller som en medarbejder har sendt til gennemgang – havner her." className="py-6" /> : (
            <ul className="divide-y divide-line">
              {pending.map((l) => (
                <li key={l.id} className="flex gap-4 p-5">
                  {l.thumb ? <img src={l.thumb} alt="" width={88} height={110} loading="lazy" className="h-[110px] w-[88px] shrink-0 rounded-md border border-line object-cover" /> : <span className="h-[110px] w-[88px] shrink-0 rounded-md bg-stone-100" />}
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold"><Link href={`/listings/${l.id}`} className="hover:underline">{l.title}</Link> <span className="font-normal text-muted">· {kr(l.priceOre)}</span></p>
                    <p className="text-caption text-muted"><Link href={`/users/${l.sellerId}`} className="hover:underline">{l.sellerName}</Link>{l.warnings > 0 && <span className="ml-1 font-semibold text-coral-600">· {l.warnings} {l.warnings === 1 ? 'advarsel' : 'advarsler'}</span>} · {categoryLabel(l.category)}{l.sub ? ` › ${l.sub}` : ''} · {ago(l.createdAt)}</p>
                    {l.description && <p className="mt-2 line-clamp-4 whitespace-pre-line rounded-md bg-sunken p-3 text-small">{l.description}</p>}
                    {canModerate && (
                      <form action={listingAction} className="mt-3 flex flex-wrap items-center gap-2">
                        <input type="hidden" name="listingId" value={l.id} />
                        <input type="hidden" name="sellerId" value={l.sellerId} />
                        <input type="hidden" name="back" value="/moderation" />
                        <button name="op" value="approve" className={`${btn} bg-forest text-white`}>Godkend</button>
                        <input name="note" placeholder="Begrundelse ved afvisning" maxLength={500} className="h-9 min-w-[180px] flex-1 rounded-md border border-line px-2 text-small" />
                        <button name="op" value="reject" className={`${btn} border border-line hover:border-ink`}>Afvis</button>
                      </form>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title={`Anmeldelser fra brugere (${reports.length})`} pad={reports.length === 0}>
          {reports.length === 0 ? <EmptyState icon="flag" title="Ingen åbne anmeldelser" description="Når brugere anmelder en annonce, kommer det her." className="py-6" /> : (
            <ul className="divide-y divide-line">
              {reports.map((r) => {
                const why = parseReason(r.reason);
                return (
                  <li key={r.id} className="flex gap-4 p-5">
                    {r.listing?.thumb ? <img src={r.listing.thumb} alt="" width={64} height={80} loading="lazy" className="h-20 w-16 shrink-0 rounded-md border border-line object-cover" /> : null}
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold">
                        {r.listing ? <Link href={`/listings/${r.listing.id}`} className="hover:underline">{r.listing.title}</Link> : <>{TARGET[r.targetType] ?? r.targetType} <span className="font-mono text-caption font-normal text-muted">{r.targetId.slice(0, 8)}</span></>}
                        {r.sameTarget > 1 && <Badge tone="coral">{r.sameTarget} anmeldelser</Badge>}
                      </p>
                      {r.listing && <p className="text-caption text-muted">Sælger: <Link href={`/users/${r.listing.sellerId}`} className="hover:underline">{r.listing.sellerName}</Link> · {STATUS_LABEL[r.listing.status]}</p>}
                      <p className="mt-2 text-small">{why.label && <b>{why.label}</b>}{why.label && why.text ? ': ' : ''}{why.text && `“${why.text}”`}</p>
                      <p className="text-caption text-muted">Anmeldt af {r.reporterId ? <Link href={`/users/${r.reporterId}`} className="hover:underline">{r.reporter}</Link> : 'slettet bruger'} · {ago(r.createdAt)}</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {r.listing && <Link href={`/listings/${r.listing.id}`} className={`${btn} inline-flex items-center bg-forest text-white`}>Åbn og handl</Link>}
                        <form action={reportAction} className="flex gap-2">
                          <input type="hidden" name="reportId" value={r.id} />
                          <button name="decision" value="dismissed" className={`${btn} border border-line hover:border-ink`}>Afvis anmeldelsen</button>
                          {!r.listing && <button name="decision" value="actioned" className={`${btn} border border-line hover:border-ink`}>Handlet</button>}
                        </form>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>
      </div>
    </AdminFrame>
  );
}
