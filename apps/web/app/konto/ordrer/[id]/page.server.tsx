import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Button, Field, Notice, PriceSummary, Select, Textarea, Timeline, type TimelineStep } from '@respin/ui';
import { formatOre, ore } from '@respin/core/money';
import { AuthPage, linkCls } from '../../../../components/AuthPage';
import { AutoRefresh } from '../../../../components/support/AutoRefresh';
import { requireSession } from '../../../../lib/auth';
import { getDb } from '../../../../lib/server';
import { getImageStore } from '../../../../lib/image-store';
import { STATUS_LABEL, getOrder } from '../../../../lib/orders';
import { payoutStatus } from '../../../../lib/payouts';
import { orderAction } from '../../../../lib/order-actions';
import { profilePath } from '../../../../lib/profile-url';

export const metadata = { title: 'Ordre', robots: { index: false } };

const fmt = (d: Date | null) => (d ? d.toLocaleString('da-DK', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Copenhagen' }) : '');
const CARRIERS = ['PostNord', 'GLS', 'DAO', 'Bring', 'Andet'];
const OK: Record<string, string> = {
  seller_ship: 'Varen er markeret som sendt. Køberen har fået besked.',
  seller_cancel: 'Salget er annulleret, og køberen får pengene tilbage.',
  buyer_cancel: 'Købet er annulleret.',
  buyer_received: 'Tak! Du har nu 48 timer til at godkende varen eller melde et problem.',
  buyer_approve: 'Tak for din godkendelse. Sælgeren får nu pengene.',
  buyer_dispute: 'Vi har modtaget dit problem og holder pengene tilbage. Kundeservice kontakter dig.'
};

function steps(status: string): TimelineStep[] {
  const order = ['paid', 'shipped', 'delivered', 'completed'];
  const at = status === 'disputed' ? 2 : order.indexOf(status);
  const t: [string, string][] = [['Betalt', 'Pengene holdes sikkert hos Stripe'], ['Sendt', 'Sælgeren har sendt varen'], ['Modtaget', '48 timer til at godkende eller melde et problem'], ['Gennemført', 'Sælgeren får pengene']];
  return t.map(([title, description], i) => ({ title, description, state: i < at ? 'done' : i === at ? (status === 'completed' ? 'done' : 'now') : 'todo' }));
}

export default async function OrderPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ ok?: string; fejl?: string; betalt?: string }> }) {
  const { id } = await params;
  const current = await requireSession(`/konto/ordrer/${/^[0-9a-f-]{36}$/.test(id) ? `${id}/` : ''}`);
  const db = getDb();
  const o = await getOrder(db, getImageStore(), current.user.id, id);
  if (!o) notFound();
  const sp = await searchParams;
  const seller = o.role === 'seller';
  const payout = seller ? await payoutStatus(db, current.user.id) : null;
  const can = (e: string) => (o.actions as readonly string[]).includes(e);
  const a = o.shippingAddress;
  const live = ['paid', 'shipped', 'delivered', 'disputed'].includes(o.status);

  return (
    <AuthPage width="page" title={o.title} crumbs={[{ label: 'Min konto', href: '/konto/' }, { label: 'Køb og salg', href: seller ? '/konto/ordrer/?vis=salg' : '/konto/ordrer/' }, { label: o.title }]}>
      {sp.betalt && o.status === 'pending_payment' && <Notice icon="info" role="status">Vi venter på bekræftelse fra betalingen. Siden opdateres af sig selv.</Notice>}
      {sp.betalt && o.status === 'paid' && <Notice icon="check" role="status"><b>Tak for dit køb!</b> Sælgeren sender varen senest {fmt(o.shipByAt)}. Du får en mail, når den er sendt.</Notice>}
      {sp.ok && OK[sp.ok] && <Notice icon="check" role="status">{OK[sp.ok]}</Notice>}
      {sp.fejl && <Notice icon="info" warn role="alert">{sp.fejl === 'begrundelse' ? 'Beskriv problemet med mindst 10 tegn.' : 'Handlingen kunne ikke udføres – ordren er måske allerede ændret.'}</Notice>}

      <div className="flex items-center gap-3 rounded-lg border border-line p-3">
        {o.image ? <img src={o.image} alt="" width={56} height={56} className="h-14 w-14 rounded-md object-cover" /> : <span className="h-14 w-14 rounded-md bg-stone-100" />}
        <div className="min-w-0 flex-1">
          <p className="font-semibold"><Link href={`/annonce/${o.listingId}/`} className="underline-offset-4 hover:underline">{o.title}</Link></p>
          <p className="text-small text-muted">{seller ? 'Solgt til' : 'Købt af'} {o.other.username ? <Link href={profilePath(o.other.username)} className={linkCls}>{o.other.name}</Link> : o.other.name} · <b>{STATUS_LABEL[o.status]}</b></p>
        </div>
        {o.status !== 'pending_payment' && <Button href={`/konto/beskeder/ny/${o.listingId}/`} variant="outline" size="sm" icon="chat">Skriv</Button>}
      </div>

      {(live || o.status === 'completed') && <Timeline steps={steps(o.status)} />}
      {o.status === 'refunded' && <Notice icon="info">Ordren er refunderet. Køberen får hele beløbet tilbage på kortet inden for 5-10 bankdage.</Notice>}

      {/* Sælger: afsend varen */}
      {seller && can('seller_ship') && (
        <section aria-labelledby="send" className="rounded-lg border-2 border-forest p-5">
          <h2 id="send" className="text-[20px] font-bold">Send varen senest {fmt(o.shipByAt)}</h2>
          {a ? (
            <address className="mt-3 rounded-md bg-sunken p-3 not-italic">
              <b>{a.name}</b><br />{a.line1}{a.line2 ? <><br />{a.line2}</> : null}<br />{a.postalCode} {a.city}{a.phone ? <><br />Tlf. {a.phone}</> : null}
            </address>
          ) : <p className="mt-2 text-small text-muted">Adressen vises her, når betalingen er registreret.</p>}
          <p className="mt-3 text-small text-slate-700">Pak varen godt ind, og send den med sporing. Sender du ikke inden fristen, får køberen automatisk pengene tilbage.</p>
          <form action={orderAction} className="mt-4 grid gap-3 sm:grid-cols-[180px_1fr_auto] sm:items-end">
            <input type="hidden" name="orderId" value={o.id} /><input type="hidden" name="event" value="seller_ship" />
            <Select label="Fragtfirma" name="carrier" options={CARRIERS} defaultValue="PostNord" />
            <Field label="Sporingsnummer" name="tracking" optional maxLength={60} autoComplete="off" />
            <Button type="submit" icon="truck">Markér som sendt</Button>
          </form>
          {payout && !payout.payoutsEnabled && (
            <Notice icon="info" warn className="mt-4">Du har ikke en godkendt udbetalingskonto endnu. Pengene venter sikkert hos Stripe – <Link href="/konto/udbetalinger/" className={linkCls}>opret den nu</Link>, så de kan udbetales, når køberen har godkendt varen.</Notice>
          )}
        </section>
      )}

      {/* Køber: modtaget / godkend / meld problem */}
      {!seller && can('buyer_received') && (
        <section aria-labelledby="modtaget" className="rounded-lg border-2 border-forest p-5">
          <h2 id="modtaget" className="text-[20px] font-bold">Har du modtaget varen?</h2>
          <p className="mt-1 text-small text-slate-700">Sendt {fmt(o.events.find((e) => e.to === 'shipped')?.at ?? null)}{o.trackingNumber ? ` · ${o.carrier ?? 'Sporing'}: ${o.trackingNumber}` : ''}. Tryk, når pakken er kommet – så har du 48 timer til at tjekke varen.</p>
          <form action={orderAction} className="mt-3"><input type="hidden" name="orderId" value={o.id} /><input type="hidden" name="event" value="buyer_received" /><Button type="submit" icon="package">Jeg har modtaget varen</Button></form>
        </section>
      )}
      {!seller && can('buyer_approve') && (
        <section aria-labelledby="godkend" className="rounded-lg border-2 border-forest p-5">
          <h2 id="godkend" className="text-[20px] font-bold">Er varen som beskrevet?</h2>
          <p className="mt-1 text-small text-slate-700">Godkend senest {fmt(o.autoCompleteAt)}. Ellers godkendes den automatisk, og sælgeren får pengene.</p>
          <form action={orderAction} className="mt-3"><input type="hidden" name="orderId" value={o.id} /><input type="hidden" name="event" value="buyer_approve" /><Button type="submit" icon="check">Ja, godkend varen</Button></form>
          <details className="mt-4 rounded-md border border-line p-3">
            <summary className="cursor-pointer font-semibold">Nej – meld et problem</summary>
            <form action={orderAction} className="mt-3 flex flex-col gap-3">
              <input type="hidden" name="orderId" value={o.id} /><input type="hidden" name="event" value="buyer_dispute" />
              <Textarea label="Hvad er der galt?" name="reason" required minLength={10} maxLength={4000} rows={4} hint="Fx 'varen er beskadiget' eller 'det er ikke den vare, der var på billedet'. Gem gerne billeder – kundeservice beder om dem." />
              <div><Button type="submit" variant="outline">Meld problem og hold pengene tilbage</Button></div>
            </form>
          </details>
        </section>
      )}
      {o.status === 'disputed' && <Notice icon="info">Der er meldt et problem. Pengene holdes tilbage, mens kundeservice undersøger sagen. Følg sagen under <Link href="/konto/support/" className={linkCls}>Kundeservice</Link>.</Notice>}

      <section aria-labelledby="beloeb">
        <h2 id="beloeb" className="mb-2 text-[17px] font-bold">{seller ? 'Det får du' : 'Det har du betalt'}</h2>
        {seller
          ? <PriceSummary rows={[['Salgspris', formatOre(ore(o.amounts.price))], ['Kommission til Videro', formatOre(ore(0))]]} total={[o.paidOut ? 'Udbetalt' : 'Du får', formatOre(ore(o.amounts.payout))]} />
          : <PriceSummary rows={[['Vare', formatOre(ore(o.amounts.price))], ['Køberbeskyttelse', formatOre(ore(o.amounts.buyerFee))], ['Fragt', formatOre(ore(o.amounts.shipping))]]} total={['I alt', formatOre(ore(o.amounts.total))]} />}
        {!seller && a && <p className="mt-3 text-small text-muted">Leveres til: {a.name}, {a.line1}, {a.postalCode} {a.city}</p>}
      </section>

      {/* Annullering: sælger kan fortryde et betalt salg (køber får pengene tilbage) */}
      {seller && can('seller_cancel') && (
        <details className="text-small">
          <summary className="cursor-pointer text-muted underline underline-offset-4">Kan du ikke sende varen?</summary>
          <form action={orderAction} className="mt-2"><input type="hidden" name="orderId" value={o.id} /><input type="hidden" name="event" value="seller_cancel" />
            <p className="text-slate-700">Annullerer du, får køberen hele beløbet tilbage. Gentagne annulleringer kan føre til advarsler.</p>
            <Button type="submit" variant="ghost" size="sm" className="mt-2">Annullér salget</Button>
          </form>
        </details>
      )}
      {!seller && can('buyer_cancel') && (
        <form action={orderAction}><input type="hidden" name="orderId" value={o.id} /><input type="hidden" name="event" value="buyer_cancel" /><Button type="submit" variant="ghost">Annullér købet</Button></form>
      )}
      {(o.status === 'pending_payment' || live) && <AutoRefresh seconds={o.status === 'pending_payment' ? 4 : 30} />}
    </AuthPage>
  );
}
