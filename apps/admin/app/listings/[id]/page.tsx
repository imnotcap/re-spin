import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Badge, Notice } from '@respin/ui';
import { can } from '@respin/security';
import { CATEGORIES } from '@respin/core/taxonomy';
import { AdminFrame, Panel, ago, kr, when } from '../../../components/AdminFrame';
import { Bars } from '../../../components/Charts';
import { requireDb, requireStaff } from '../../../lib/auth';
import { deleteListingAction, listingAction, recategorizeAction } from '../../../lib/actions';
import { MODERATION_LABEL, NOTE_TEMPLATES, STATUS_LABEL, WARNING_REASONS, categoryLabel, getListingAdmin } from '../../../lib/listings';

export const metadata = { title: 'Annonce' };

const OK: Record<string, string> = {
  approve: 'Annoncen er godkendt.', reject: 'Annoncen er afvist. Sælgeren kan se begrundelsen under "Mine annoncer".', remove: 'Annoncen er fjernet. Sælgeren kan se begrundelsen.',
  restore: 'Annoncen er sat til salg igen.', to_review: 'Annoncen er sendt til gennemgang og er skjult indtil videre.', kategori: 'Kategorien er ændret.'
};
const FEJL: Record<string, string> = {
  note_required: 'Skriv en begrundelse på mindst 5 tegn – sælgeren ser den.', invalid_state: 'Det kan ikke lade sig gøre i annoncens nuværende tilstand (fx reserveret med en ordre).',
  not_found: 'Annoncen findes ikke.', has_orders: 'Annoncen har ordrer og kan ikke slettes. Fjern den i stedet.', bekraeft: 'Skriv SLET for at bekræfte.', kategori: 'Vælg en gyldig kategori.', ukendt: 'Ukendt handling.'
};
const MOD_TONE = { pending: 'warn', approved: 'forest', rejected: 'coral' } as const;
const btn = 'h-9 rounded-md px-4 text-small font-semibold';
const WEB = 'https://videro.dk';

export default async function ListingAdminPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ ok?: string; fejl?: string; advaret?: string }> }) {
  const staff = await requireStaff('listing.view');
  const { id } = await params;
  const sp = await searchParams;
  const l = await getListingAdmin(requireDb(), id);
  if (!l) notFound();
  const canModerate = can(staff.role, 'listing.moderate');
  const canWarn = can(staff.role, 'user.warn');
  const openReports = l.reports.filter((r) => r.status === 'open').length;

  return (
    <AdminFrame staff={staff} title={l.title} section="listings" crumbs={[{ label: 'Annoncer', href: '/listings' }, { label: l.title }]}
      actions={<span className="flex gap-1.5"><Badge tone={l.status === 'active' ? 'forest' : 'neutral'}>{STATUS_LABEL[l.status]}</Badge><Badge tone={MOD_TONE[l.moderation]}>{MODERATION_LABEL[l.moderation]}</Badge></span>}>
      {sp.ok && OK[sp.ok] && <Notice icon="check" role="status" className="mb-4">{OK[sp.ok]}{sp.advaret ? ' Sælgeren har fået en advarsel.' : ''}</Notice>}
      {sp.fejl && <Notice icon="info" warn role="alert" className="mb-4">{FEJL[sp.fejl] ?? 'Noget gik galt.'}</Notice>}
      {l.note && <Notice icon="info" warn className="mb-4"><b>Begrundelse til sælgeren:</b> {l.note}{l.moderatedAt ? ` (${when(l.moderatedAt)})` : ''}</Notice>}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="flex flex-col gap-4">
          <Panel title={`Billeder (${l.images.length})`}>
            {l.images.length === 0 ? <p className="text-small text-muted">Ingen billeder.</p> : l.images[0]?.thumb ? (
              <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {l.images.map((im, i) => <li key={i}><a href={im.full ?? '#'} target="_blank" rel="noopener noreferrer"><img src={im.thumb!} alt={`Billede ${i + 1}`} loading="lazy" className="aspect-[4/5] w-full rounded-md border border-line object-cover" /></a></li>)}
              </ul>
            ) : <p className="text-small text-muted">Sæt IMAGE_BASE_URL for at se billederne her.</p>}
          </Panel>

          <Panel title="Annoncen">
            <dl className="grid gap-x-6 gap-y-2 text-small sm:grid-cols-2">
              <div><dt className="text-muted">Pris</dt><dd className="font-semibold">{kr(l.priceOre)}</dd></div>
              <div><dt className="text-muted">Kategori</dt><dd>{categoryLabel(l.category)}{l.sub ? ` · ${l.sub}` : ''}</dd></div>
              <div><dt className="text-muted">Mærke / størrelse</dt><dd>{l.brand ?? '–'} · {l.size ?? '–'}</dd></div>
              <div><dt className="text-muted">Oprettet / ændret</dt><dd>{when(l.createdAt)} · {ago(l.updatedAt)}</dd></div>
            </dl>
            {l.description && <p className="mt-4 whitespace-pre-line rounded-md bg-sunken p-3 text-small">{l.description}</p>}
            {l.status !== 'removed' && l.moderation === 'approved' && <a href={`${WEB}/annonce/${l.id}/`} target="_blank" rel="noopener noreferrer" className="mt-3 inline-block text-small font-semibold text-forest underline underline-offset-4">Se på videro.dk ↗</a>}
          </Panel>

          <Panel title="Statistik">
            <dl className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[['Visninger', l.stats.views], ['Unikke (dagligt)', l.stats.visitors], ['Klik på kortet', l.stats.clicks], ['Hjerter (netto)', l.stats.favorites]].map(([k, v]) => (
                <div key={k as string}><dt className="text-caption text-muted">{k}</dt><dd className="text-[22px] font-bold tabular-nums">{Number(v).toLocaleString('da-DK')}</dd></div>
              ))}
            </dl>
            <Bars series={l.daily.map((d) => ({ day: d.day, value: d.n }))} label="Visninger de seneste 14 dage" height={72} />
          </Panel>

          <Panel title={`Anmeldelser (${l.reports.length}${openReports ? `, ${openReports} åbne` : ''})`} pad={l.reports.length === 0}>
            {l.reports.length === 0 ? <p className="text-small text-muted">Ingen har anmeldt annoncen.</p> : (
              <ul className="divide-y divide-line text-small">
                {l.reports.map((r) => (
                  <li key={r.id} className="flex gap-3 px-5 py-2.5">
                    <span className="min-w-0 flex-1">“{r.reason}” <span className="text-muted">– {r.reporterId ? <Link href={`/users/${r.reporterId}`} className="hover:underline">{r.reporter}</Link> : 'slettet bruger'}, {ago(r.createdAt)}</span></span>
                    <Badge tone={r.status === 'open' ? 'warn' : 'neutral'}>{r.status === 'open' ? 'Åben' : r.status === 'actioned' ? 'Handlet' : 'Afvist'}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title="Historik" pad={l.history.length === 0}>
            {l.history.length === 0 ? <p className="text-small text-muted">Ingen handlinger fra medarbejdere endnu.</p> : (
              <ul className="divide-y divide-line text-small">
                {l.history.map((h, i) => (
                  <li key={i} className="flex gap-3 px-5 py-2"><span className="w-32 shrink-0 text-muted">{when(h.at)}</span><span className="min-w-0 flex-1"><b>{h.action}</b> · {h.actorName ?? h.actor ?? 'system'}{(h.metadata as { note?: string })?.note ? <span className="block truncate text-muted">“{(h.metadata as { note?: string }).note}”</span> : null}</span></li>
                ))}
              </ul>
            )}
          </Panel>
        </div>

        <div className="flex flex-col gap-4">
          <Panel title="Sælger">
            <p className="font-semibold"><Link href={`/users/${l.sellerId}`} className="hover:underline">{l.sellerName}</Link> {l.sellerStatus !== 'active' && <Badge tone="coral">Spærret</Badge>}</p>
            <p className="break-all text-small text-muted">{l.sellerEmail}{l.sellerUsername ? ` · @${l.sellerUsername}` : ''}</p>
            <p className="mt-2 text-small">{l.sellerListings} annoncer · <span className={l.sellerWarnings >= 3 ? 'font-bold text-coral-600' : ''}>{l.sellerWarnings} {l.sellerWarnings === 1 ? 'advarsel' : 'advarsler'}</span> · medlem siden {when(l.sellerCreated)}</p>
            {l.sellerWarnings >= 2 && <p className="mt-2 text-caption text-coral-600">Overvej at spærre brugeren ved næste brud.</p>}
          </Panel>

          {canModerate && (
            <Panel title="Moderér">
              <form action={listingAction} className="flex flex-col gap-3">
                <input type="hidden" name="listingId" value={l.id} />
                <input type="hidden" name="sellerId" value={l.sellerId} />
                <label className="flex flex-col gap-1 text-small font-semibold">Begrundelse til sælgeren <span className="font-normal text-muted">(kræves ved afvisning og fjernelse)</span>
                  <textarea name="note" rows={4} maxLength={500} defaultValue="" className="rounded-md border border-line p-2 font-normal" placeholder="Skriv kort og venligt, hvad der er galt, og hvad sælgeren kan gøre." />
                </label>
                <details className="text-small"><summary className="cursor-pointer font-semibold text-forest">Standardtekster</summary>
                  <ul className="mt-2 flex flex-col gap-1.5">{NOTE_TEMPLATES.map((n) => <li key={n.id} className="rounded-md bg-sunken p-2"><b>{n.label}:</b> {n.text}</li>)}</ul>
                  <p className="mt-1 text-caption text-muted">Kopiér en tekst ind i feltet og ret den til.</p>
                </details>
                {canWarn && (
                  <fieldset className="flex flex-col gap-2 rounded-md border border-line p-3 text-small">
                    <label className="flex items-center gap-2 font-semibold"><input type="checkbox" name="warn" className="h-4 w-4" />Giv sælgeren en advarsel (samme tekst)</label>
                    <select name="warnReason" defaultValue="other" className="h-9 rounded-md border border-line px-2">{Object.entries(WARNING_REASONS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
                  </fieldset>
                )}
                {openReports > 0 && <label className="flex items-center gap-2 text-small"><input type="checkbox" name="closeReports" defaultChecked className="h-4 w-4" />Luk de {openReports} åbne anmeldelser</label>}
                <div className="flex flex-wrap gap-2">
                  {l.moderation !== 'approved' && l.status !== 'removed' && <button name="op" value="approve" className={`${btn} bg-forest text-white`}>Godkend</button>}
                  {l.status !== 'removed' && l.moderation !== 'rejected' && <button name="op" value="reject" className={`${btn} border border-line hover:border-ink`}>Afvis</button>}
                  {l.status !== 'removed' && <button name="op" value="remove" className={`${btn} bg-coral-600 text-white`}>Fjern annonce</button>}
                  {l.status === 'removed' && <button name="op" value="restore" className={`${btn} border border-line hover:border-ink`}>Sæt til salg igen</button>}
                  {l.moderation === 'approved' && ['active', 'draft'].includes(l.status) && <button name="op" value="to_review" className={`${btn} border border-line hover:border-ink`}>Send til gennemgang</button>}
                </div>
                <p className="text-caption text-muted"><b>Afvis:</b> skjules, sælgeren kan rette og sende igen. <b>Fjern:</b> skjules permanent for sælgeren (kan fortrydes her).</p>
              </form>
            </Panel>
          )}

          {canModerate && (
            <Panel title="Flyt kategori">
              <form action={recategorizeAction} className="flex flex-col gap-2">
                <input type="hidden" name="listingId" value={l.id} />
                <select name="target" defaultValue={`${l.category}|${l.sub ?? ''}`} className="h-10 rounded-md border border-line px-2 text-small">
                  {CATEGORIES.map((c) => (
                    <optgroup key={c.slug} label={c.label}>
                      <option value={`${c.slug}|`}>{c.label} (uden underkategori)</option>
                      {c.groups.flatMap((g) => g.items.map((s) => <option key={`${c.slug}|${s}`} value={`${c.slug}|${s}`}>{g.label} › {s}</option>))}
                    </optgroup>
                  ))}
                </select>
                <button className={`${btn} self-start border border-line hover:border-ink`}>Flyt</button>
              </form>
            </Panel>
          )}

          {l.warnings.length > 0 && (
            <Panel title="Advarsler for denne annonce">
              <ul className="flex flex-col gap-2 text-small">{l.warnings.map((w) => <li key={w.id}><b>{WARNING_REASONS[w.reason]}</b> · {ago(w.createdAt)}<span className="block text-muted">{w.message}</span></li>)}</ul>
            </Panel>
          )}

          {can(staff.role, 'listing.delete') && (
            <Panel title="Slet permanent">
              <form action={deleteListingAction} className="flex flex-col gap-2 text-small">
                <input type="hidden" name="listingId" value={l.id} />
                <p className="text-muted">Annoncen og dens billeder slettes fra databasen og kan ikke gendannes. Brug normalt <b>Fjern</b> i stedet. {l.hasOrders && <b className="text-coral-600">Annoncen har ordrer og kan ikke slettes.</b>}</p>
                <label className="flex flex-col gap-1 font-semibold">Begrundelse (til audit-loggen)<input name="reason" required minLength={5} maxLength={500} className="h-9 rounded-md border border-line px-2 font-normal" /></label>
                <label className="flex flex-col gap-1 font-semibold">Skriv SLET for at bekræfte<input name="confirm" required autoComplete="off" className="h-9 rounded-md border border-line px-2 font-normal" /></label>
                <button disabled={l.hasOrders} className={`${btn} self-start bg-coral-600 text-white disabled:opacity-40`}>Slet permanent</button>
              </form>
            </Panel>
          )}
        </div>
      </div>
    </AdminFrame>
  );
}
