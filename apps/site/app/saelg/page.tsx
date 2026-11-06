import type { Metadata } from 'next';
import { Breadcrumbs, Button, Icon, Notice, PriceSummary } from '@respin/ui';
import { sellerFee, sellerPayout } from '@respin/core/fees';
import { formatOre, fromKr } from '@respin/core/money';
import { STEPS } from '../../lib/content';

export const metadata: Metadata = {
  title: 'Sælg på re:spin',
  description: 'Det er gratis at sætte tøj, sko og boligting til salg på re:spin. Du betaler kun 1 % (0,5 % som certificeret), når varen er solgt.'
};

const EXAMPLE = fromKr(300);

const TIPS = [
  { icon: 'camera', title: 'Lyse billeder', text: 'Fotografér i dagslys mod en rolig baggrund. Vis mærket, og vis fejl tydeligt.' },
  { icon: 'edit', title: 'Ærlig beskrivelse', text: 'Skriv mål, materiale og stand. En ærlig annonce giver færre spørgsmål og glade købere.' },
  { icon: 'tag', title: 'Rimelig pris', text: 'Se hvad lignende varer koster. Køber ser altid prisen inkl. køberbeskyttelse.' },
  { icon: 'package', title: 'Send hurtigt', text: 'Pak varen godt ind og aflevér den i pakkeshoppen inden for 5 dage.' }
] as const;

export default function SellPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 pt-5 sm:px-6">
      <Breadcrumbs items={[{ label: 'Forside', href: '/' }, { label: 'Sælg' }]} />

      <div className="mt-6 grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] lg:gap-14">
        <div>
          <h1 className="text-h1 sm:text-[38px] sm:leading-[44px]">Sælg dit tøj – gratis</h1>
          <p className="mt-3 max-w-xl text-body text-muted sm:text-[17px] sm:leading-[26px]">
            Det koster ikke noget at sætte til salg. Når varen er solgt, går 1 % til re:spin – kun 0,5 %, hvis du er certificeret sælger.
          </p>
          <Notice icon="info" warn className="mt-5 max-w-xl">Appen er under udvikling. Du kan ikke oprette annoncer endnu.</Notice>

          <h2 className="mt-10 text-h2">Sådan gør du</h2>
          <ol className="mt-4 grid gap-3 sm:grid-cols-3">
            {STEPS.seller.map((s, i) => (
              <li key={s.title} className="rounded-lg bg-surface p-5 shadow-line">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-md bg-grad-lime text-ink"><Icon name={s.icon} size={20} /></span>
                  <span className="text-caption font-bold uppercase tracking-[0.08em] text-muted">Trin {i + 1}</span>
                </div>
                <h3 className="mt-3 text-h3">{s.title}</h3>
                <p className="mt-1 text-small text-slate-700">{s.text}</p>
              </li>
            ))}
          </ol>

          <h2 className="mt-10 text-h2">Gode råd til en annonce, der sælger</h2>
          <ul className="mt-4 grid gap-4 sm:grid-cols-2">
            {TIPS.map((t) => (
              <li key={t.title} className="flex gap-3">
                <Icon name={t.icon} size={22} className="mt-0.5 shrink-0 text-forest" />
                <div><h3 className="text-body font-bold">{t.title}</h3><p className="text-small text-slate-700">{t.text}</p></div>
              </li>
            ))}
          </ul>
        </div>

        <aside aria-labelledby="eksempel" className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-xl bg-surface p-6 shadow-line">
            <h2 id="eksempel" className="text-h3">Eksempel: du sælger for {formatOre(EXAMPLE)}</h2>
            <PriceSummary className="mt-4" rows={[
              ['Salgspris', formatOre(EXAMPLE)],
              ['Gebyr til re:spin (1 %)', `− ${formatOre(sellerFee(EXAMPLE, false))}`]
            ]} total={['Du får udbetalt', formatOre(sellerPayout(EXAMPLE, false))]} />
            <p className="mt-3 text-small text-muted">Som certificeret sælger (0,5 %) får du {formatOre(sellerPayout(EXAMPLE, true))}. Køber betaler selv køberbeskyttelse og fragt.</p>
            <Button href="/gebyrer/" variant="outline" full className="mt-5" iconRight="arrow">Beregn din udbetaling</Button>
          </div>
        </aside>
      </div>
    </div>
  );
}
