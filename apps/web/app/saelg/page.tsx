import type { Metadata } from 'next';
import { pageMetadata } from '../../lib/seo';
import { Breadcrumbs, Button, Icon, Notice, PriceSummary, StepList } from '@respin/ui';
import { sellerFee, sellerPayout } from '@respin/core/fees';
import { formatOre, fromKr } from '@respin/core/money';
import { STEPS } from '../../lib/content';
import { T } from '../../lib/i18n/client';

export const metadata: Metadata = pageMetadata({ title: 'Sælg på Videro', description: 'Det er gratis at sætte tøj, sko og boligting til salg på Videro. Du betaler kun 1 % (0,5 % som certificeret), når varen er solgt.', path: '/saelg/' });

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
      <Breadcrumbs items={[{ label: <T k="crumb.home" />, href: '/' }, { label: 'Sælg' }]} />

      <div className="mt-6 grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] lg:gap-14">
        <div>
          <h1 className="text-[32px] font-bold leading-[38px] tracking-[-0.01em] sm:text-[40px] sm:leading-[46px]">Sælg dit tøj – gratis</h1>
          <p className="mt-3 max-w-xl text-body text-muted sm:text-[17px] sm:leading-[26px]">
            Det koster ikke noget at sætte til salg. Når varen er solgt, går 1 % til Videro – kun 0,5 %, hvis du er certificeret sælger.
          </p>
          {process.env.NEXT_PUBLIC_AUTH_ENABLED === '1'
            ? <Button href="/saelg/ny/" size="lg" icon="plus" className="mt-6">Sæt en vare til salg</Button>
            : <Notice icon="info" warn className="mt-5 max-w-xl">Dette er en testversion. Her kan du ikke oprette annoncer.</Notice>}

          <h2 className="mt-10 text-h2">Sådan gør du</h2>
          <StepList className="mt-4" steps={STEPS.seller} />

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
          <div className="rounded-lg border border-line bg-surface p-6">
            <h2 id="eksempel" className="text-h3">Eksempel: du sælger for {formatOre(EXAMPLE)}</h2>
            <PriceSummary className="mt-4" rows={[
              ['Salgspris', formatOre(EXAMPLE)],
              ['Gebyr til Videro (1 %)', `− ${formatOre(sellerFee(EXAMPLE, false))}`]
            ]} total={['Du får udbetalt', formatOre(sellerPayout(EXAMPLE, false))]} />
            <p className="mt-3 text-small text-muted">Som certificeret sælger (0,5 %) får du {formatOre(sellerPayout(EXAMPLE, true))} – køber betaler selv køberbeskyttelse og fragt.</p>
            <Button href="/gebyrer/" variant="outline" full className="mt-5" iconRight="arrow">Beregn din udbetaling</Button>
          </div>
        </aside>
      </div>
    </div>
  );
}
