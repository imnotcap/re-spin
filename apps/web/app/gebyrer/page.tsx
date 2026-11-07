import type { Metadata } from 'next';
import { Breadcrumbs, Notice } from '@respin/ui';
import { FeeCalculator } from '../../components/FeeCalculator';
import { T } from '../../lib/i18n/client';

export const metadata: Metadata = { title: 'Gebyrer', description: 'Se præcis, hvad køber betaler, og hvad sælger får udbetalt på re:spin.' };

export default function FeesPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 pt-5 sm:px-6">
      <Breadcrumbs items={[{ label: <T k="crumb.home" />, href: '/' }, { label: 'Gebyrer' }]} />
      <h1 className="mt-6 text-h1 sm:text-[38px] sm:leading-[44px]">Gebyrer</h1>
      <p className="mt-3 max-w-2xl text-[17px] leading-[26px] text-slate-700">Gratis at oprette annoncer. Sælger betaler 1 % (0,5 % som certificeret), køber betaler køberbeskyttelse på 5 % + 3 kr. og fragt.</p>
      <div className="mt-10"><FeeCalculator /></div>
      <div className="mt-8 max-w-2xl"><Notice icon="info">Beløbene beregnes med de samme regler som i appen og afrundes til hele øre. Satserne gælder for testversionen og kan ændre sig før lancering.</Notice></div>
    </div>
  );
}
