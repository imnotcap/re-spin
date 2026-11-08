import { Button, Icon, Notice } from '@respin/ui';
import { reportListingAction } from '../../lib/report-actions';
import { REPORT_REASONS } from '../../lib/report';

/** "Anmeld annonce": en lille formular, der folder sig ud (virker også uden JavaScript) */
export function ReportListing({ listingId, status }: { listingId: string; status?: string }) {
  if (status === 'tak') return <Notice id="anmeld" icon="check" role="status" className="mt-6">Tak for anmeldelsen. Vi kigger på annoncen – typisk inden for et døgn.</Notice>;
  return (
    <details id="anmeld" className="group mt-6 rounded-lg border border-line" open={status === 'fejl' || status === 'mange'}>
      <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-small font-semibold text-slate-700 hover:text-ink">
        <Icon name="flag" size={16} />Anmeld annonce
        <Icon name="down" size={16} className="ml-auto transition-transform group-open:rotate-180" />
      </summary>
      <form action={reportListingAction} className="flex flex-col gap-3 border-t border-line px-4 py-4">
        <input type="hidden" name="listingId" value={listingId} />
        {status === 'fejl' && <p role="alert" className="text-small text-red-700">Vælg en grund, og prøv igen.</p>}
        {status === 'mange' && <p role="alert" className="text-small text-red-700">Du har sendt mange anmeldelser i dag. Prøv igen i morgen, eller skriv til kundeservice.</p>}
        <fieldset className="flex flex-col gap-1.5">
          <legend className="mb-1 text-small font-semibold">Hvad er der galt?</legend>
          {Object.entries(REPORT_REASONS).map(([value, label]) => (
            <label key={value} className="flex items-center gap-2 text-small">
              <input type="radio" name="reason" value={value} required className="h-4 w-4 accent-[var(--rs-forest)]" />{label}
            </label>
          ))}
        </fieldset>
        <label className="flex flex-col gap-1 text-small">
          <span className="font-semibold">Uddyb gerne <span className="font-normal text-muted">(valgfrit)</span></span>
          <textarea name="text" rows={3} maxLength={500} className="rs-textarea" />
        </label>
        <p className="text-caption text-muted">Sælgeren får ikke at vide, hvem der har anmeldt. Du skal være logget ind.</p>
        <Button type="submit" variant="outline" size="sm" className="self-start">Send anmeldelse</Button>
      </form>
    </details>
  );
}
