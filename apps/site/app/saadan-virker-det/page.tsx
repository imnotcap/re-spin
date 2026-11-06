import type { Metadata } from 'next';
import { Breadcrumbs } from '@respin/ui';
import { HowItWorks } from '../../components/sections/HowItWorks';
import { Stats } from '../../components/sections/Stats';
import { Features } from '../../components/sections/Features';
import { FeesTeaser } from '../../components/sections/FeesTeaser';
import { Faq } from '../../components/sections/Faq';

export const metadata: Metadata = {
  title: 'Sådan virker det',
  description: 'Sådan køber og sælger du på re:spin: tre trin, køberbeskyttelse, gebyrer og svar på de mest stillede spørgsmål.'
};

export default function HowPage() {
  return (
    <>
      <div className="mx-auto max-w-7xl px-4 pt-5 sm:px-6">
        <Breadcrumbs items={[{ label: 'Forside', href: '/' }, { label: 'Sådan virker det' }]} />
        <header className="mx-auto mt-8 max-w-2xl text-center">
          <h1 className="text-h1 sm:text-[38px] sm:leading-[44px]">Sådan virker re:spin</h1>
          <p className="mt-3 text-body text-muted sm:text-[17px] sm:leading-[26px]">
            Sæt dit tøj til salg gratis, og køb trygt fra folk i hele Danmark. Her er det hele – også det med småt.
          </p>
        </header>
      </div>
      <div className="mt-10"><Stats /></div>
      <HowItWorks />
      <Features />
      <FeesTeaser />
      <Faq />
    </>
  );
}
