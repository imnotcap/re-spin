import type { Metadata } from 'next';
import { Notice } from '@respin/ui';
import { FeeCalculator } from '../../components/FeeCalculator';

export const metadata: Metadata = { title: 'Gebyrer', description: 'Se præcis, hvad køber betaler, og hvad sælger får udbetalt på re:spin.' };

export default function FeesPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 pt-12 sm:px-6">
      <h1 className="text-[34px] font-extrabold leading-[40px] tracking-[-0.02em] sm:text-[44px] sm:leading-[50px]">Gebyrer</h1>
      <p className="mt-3 max-w-2xl text-[17px] leading-[26px] text-slate-700">Gratis at oprette annoncer. Sælger betaler 1 % (0,5 % som certificeret), køber betaler køberbeskyttelse på 5 % + 3 kr. og fragt.</p>
      <div className="mt-10"><FeeCalculator /></div>
      <div className="mt-8 max-w-2xl"><Notice icon="info">Beløbene beregnes med de samme regler som i appen og afrundes til hele øre. Satserne gælder for testversionen og kan ændre sig før lancering.</Notice></div>
    </div>
  );
}
