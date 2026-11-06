import type { Metadata } from 'next';
import { Breadcrumbs, Notice, StepList, Timeline } from '@respin/ui';

const section = 'grid grid-cols-1 gap-6 border-t border-line py-12 md:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)] md:gap-12 md:py-16';

export const metadata: Metadata = { title: 'Tryghed og sikkerhed', description: 'Sådan beskytter re:spin dig som køber og sælger.' };

const TIPS = [
  { title: 'Betal altid i appen', text: 'Betaler du med MobilePay, bankoverførsel eller gavekort direkte til sælger, er du ikke dækket af køberbeskyttelsen.' },
  { title: 'Hold samtalen i appen', text: 'Bliver du bedt om at skrive på WhatsApp, Messenger eller mail, er det et klassisk tegn på svindel. Vi advarer, når vi ser det.' },
  { title: 'Klik ikke på betalingslinks', text: 're:spin sender aldrig links til betaling via chat eller sms. Log ind i appen i stedet.' },
  { title: 'Brug en passkey', text: 'Så er der ingen adgangskode, der kan stjæles, og falske login-sider virker ikke.' }
];

export default function SecurityPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 pt-5 sm:px-6">
      <Breadcrumbs items={[{ label: 'Forside', href: '/' }, { label: 'Tryghed og sikkerhed' }]} />
      <header className="max-w-2xl pb-12 pt-6 md:pb-16">
        <h1 className="text-[32px] font-bold leading-[38px] tracking-[-0.01em] sm:text-[40px] sm:leading-[46px]">Tryghed og sikkerhed</h1>
        <p className="mt-3 text-[17px] leading-[27px] text-slate-700">Sådan holder vi pengene og dine oplysninger sikre – og sådan undgår du svindel.</p>
      </header>

      <section aria-labelledby="flow-title" className={section}>
        <div>
          <h2 id="flow-title" className="text-[24px] font-bold leading-[30px]">Sådan virker køberbeskyttelsen</h2>
          <p className="mt-2 text-body text-muted">Med på alle køb, der betales i appen.</p>
        </div>
        <Timeline steps={[
          { title: 'Du betaler i appen', description: 'Pengene holdes sikkert – sælger får dem ikke endnu.', state: 'done' },
          { title: 'Sælger sender varen', description: 'Inden for 5 dage – ellers får du automatisk pengene tilbage.', state: 'done' },
          { title: 'Du modtager varen', description: 'Du har 48 timer til at godkende eller melde et problem.', state: 'now' },
          { title: 'Sælger får pengene', description: 'Når du godkender – eller automatisk efter 48 timer.' }
        ]} />
      </section>

      <section aria-labelledby="tips-title" className={section}>
        <div>
          <h2 id="tips-title" className="text-[24px] font-bold leading-[30px]">Undgå svindel</h2>
          <p className="mt-2 text-body text-muted">De fire vigtigste råd.</p>
        </div>
        <StepList steps={TIPS} />
      </section>

      <section aria-labelledby="data-title" className={section}>
        <div>
          <h2 id="data-title" className="text-[24px] font-bold leading-[30px]">Dine oplysninger</h2>
        </div>
        <div className="max-w-2xl">
          <ul className="list-disc space-y-2 pl-5 text-body text-slate-700">
            <li>Vi gemmer ingen kort- eller bankoplysninger – det håndterer vores betalingspartner.</li>
            <li>Adgangskoder gemmes aldrig, så de kan læses. Du kan også logge ind med Face ID, fingeraftryk eller en kode på telefonen.</li>
            <li>Hjemmesiden bruger ingen cookies og ingen sporing. Dine favoritter gemmes kun i din egen browser.</li>
          </ul>
          <Notice icon="info" className="mt-6">Har du fundet et sikkerhedsproblem? Skriv til os fortroligt via projektets side på GitHub.</Notice>
        </div>
      </section>
    </div>
  );
}
