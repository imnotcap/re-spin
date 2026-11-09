import Link from 'next/link';
import { Button, Icon, Notice } from '@respin/ui';
import { formatOre, ore } from '@respin/core/money';
import { AuthPage, linkCls } from '../../../components/AuthPage';
import { requireSession } from '../../../lib/auth';
import { getDb, getStripeGatewayOrNull } from '../../../lib/server';
import { payoutStatus, requirementLabel, syncPayoutAccount } from '../../../lib/payouts';
import { payoutDashboardAction, payoutOnboardingAction } from '../../../lib/order-actions';

export const metadata = { title: 'Udbetalinger', robots: { index: false } };

const ERR: Record<string, string> = {
  betaling: 'Betaling er ikke slået til endnu. Prøv igen senere.',
  konto: 'Udbetalingskontoen kunne ikke oprettes. Prøv igen, eller kontakt kundeservice.',
  oversigt: 'Stripe-oversigten kunne ikke åbnes. Prøv igen om lidt.'
};

/**
 * Udbetalingskonto: sælgeren opretter den hos Stripe, der kontrollerer identitet (KYC) og bankkonto på sin egen side.
 * Videro viser kun status og hvad der mangler – aldrig legitimation, CPR eller kontonummer.
 */
export default async function PayoutsPage({ searchParams }: { searchParams: Promise<{ retur?: string; forny?: string; fejl?: string }> }) {
  const current = await requireSession('/konto/udbetalinger/');
  const sp = await searchParams;
  const db = getDb();
  const gw = getStripeGatewayOrNull();
  // Tilbage fra Stripe: hent status direkte (webhooken kan komme lidt senere)
  if ((sp.retur || sp.forny) && gw) await syncPayoutAccount(db, gw, current.user.id).catch(() => undefined);
  const s = await payoutStatus(db, current.user.id);
  const labels = [...new Set(s.requirements.map(requirementLabel))];

  const state = s.kycStatus === 'rejected' ? 'rejected' : s.payoutsEnabled ? 'ready' : s.hasAccount ? (labels.length ? 'missing' : 'checking') : 'none';
  return (
    <AuthPage width="page" title="Udbetalinger" crumbs={[{ label: 'Min konto', href: '/konto/' }, { label: 'Udbetalinger' }]}
      intro={<>Når du sælger, holder vi pengene hos vores betalingsudbyder <b>Stripe</b>, til køberen har modtaget varen. For at få dem udbetalt til din bankkonto skal du oprette en udbetalingskonto hos Stripe og bekræfte din identitet. Det tager et par minutter og skal kun gøres én gang.</>}>
      {sp.fejl && ERR[sp.fejl] && <Notice icon="info" warn role="alert">{ERR[sp.fejl]}</Notice>}
      {sp.retur && state === 'ready' && <Notice icon="check" role="status"><b>Din udbetalingskonto er godkendt.</b> Pengene fra dine salg udbetales automatisk.</Notice>}

      <section aria-labelledby="status" className="rounded-lg border border-line p-5">
        <div className="flex items-start gap-4">
          <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${state === 'ready' ? 'bg-forest text-white' : state === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-stone-100 text-forest'}`}>
            <Icon name={state === 'ready' ? 'check' : state === 'rejected' ? 'close' : 'shield'} size={22} />
          </span>
          <div className="min-w-0 flex-1">
            <h2 id="status" className="text-[20px] font-bold leading-[26px]">
              {state === 'ready' ? 'Klar til udbetaling' : state === 'missing' ? 'Stripe mangler oplysninger' : state === 'checking' ? 'Stripe kontrollerer dine oplysninger' : state === 'rejected' ? 'Kontoen er afvist af Stripe' : 'Ingen udbetalingskonto endnu'}
            </h2>
            <p className="mt-1 text-small text-slate-700">
              {state === 'ready' && 'Identitet og bankkonto er bekræftet. Pengene sendes til din bankkonto, når køberen har godkendt varen.'}
              {state === 'missing' && 'Udbetalinger er sat på pause, til Stripe har fået det, der mangler:'}
              {state === 'checking' && 'Det tager som regel kun få minutter. Siden opdateres, når Stripe har svaret.'}
              {state === 'rejected' && 'Stripe kan ikke godkende kontoen. Kontakt kundeservice, så hjælper vi dig videre.'}
              {state === 'none' && 'Du kan godt sælge uden – men pengene kan først udbetales, når kontoen er oprettet og godkendt.'}
            </p>
            {state === 'missing' && <ul className="mt-2 list-disc pl-5 text-small text-slate-700">{labels.map((l) => <li key={l}>{l}</li>)}</ul>}
            <div className="mt-4 flex flex-wrap gap-2">
              {state !== 'ready' && state !== 'rejected' && (
                <form action={payoutOnboardingAction}>
                  <Button type="submit" icon={state === 'none' ? 'plus' : 'arrow'}>{state === 'none' ? 'Opret udbetalingskonto' : 'Fortsæt hos Stripe'}</Button>
                </form>
              )}
              {s.hasAccount && gw && (
                <form action={payoutDashboardAction}><Button type="submit" variant="outline" iconRight="arrow">Se udbetalinger hos Stripe</Button></form>
              )}
              {state === 'rejected' && <Button href="/konto/support/ny/" variant="outline">Kontakt kundeservice</Button>}
            </div>
            {!gw && <p className="mt-3 text-caption text-muted">Testtilstand uden Stripe: kontoen godkendes med det samme.</p>}
          </div>
        </div>
      </section>

      <dl className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {[
          ['På vej', s.inProgressOre, 'Solgt, men køberen har ikke modtaget varen endnu'],
          ['Venter på udbetalingskonto', s.waitingOre, 'Frigivet til dig – udbetales, når kontoen er godkendt'],
          ['Sendt til Stripe', s.paidOutOre, 'Stripe overfører til din bankkonto'],
        ].map(([label, amount, help]) => (
          <div key={label as string} className="rounded-lg border border-line p-4">
            <dt className="text-small text-muted">{label}</dt>
            <dd className="mt-1 text-[22px] font-extrabold tabular-nums">{formatOre(ore(amount as number))}</dd>
            <dd className="mt-1 text-caption text-muted">{help}</dd>
          </div>
        ))}
      </dl>

      <section aria-labelledby="hvorfor" className="text-small text-slate-700">
        <h2 id="hvorfor" className="text-[17px] font-bold text-ink">Hvorfor skal jeg bekræfte min identitet?</h2>
        <p className="mt-1">Betalingsudbydere skal efter hvidvaskloven kende de personer, de udbetaler penge til. Stripe beder derfor om navn, fødselsdato, adresse og bankkonto – og nogle gange et billede af legitimation. Oplysningerne gives direkte til Stripe; Videro ser dem ikke. Læs mere i <Link href="/vilkaar/#udbetaling" className={linkCls}>vilkårene</Link> og <a href="https://stripe.com/dk/privacy" rel="noopener noreferrer" className={linkCls}>Stripes privatlivspolitik</a>.</p>
      </section>
    </AuthPage>
  );
}
