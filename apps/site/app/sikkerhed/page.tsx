import type { Metadata } from 'next';
import { Breadcrumbs, Notice, Timeline } from '@respin/ui';

export const metadata: Metadata = { title: 'Tryghed og sikkerhed', description: 'Sådan beskytter re:spin dig som køber og sælger.' };

const TIPS = [
  { title: 'Betal altid i appen', text: 'Betaler du med MobilePay, bankoverførsel eller gavekort direkte til sælger, er du ikke dækket af køberbeskyttelsen.' },
  { title: 'Hold samtalen i appen', text: 'Bliver du bedt om at skrive på WhatsApp, Messenger eller mail, er det et klassisk tegn på svindel. Vi advarer, når vi ser det.' },
  { title: 'Klik ikke på betalingslinks', text: 're:spin sender aldrig links til betaling via chat eller sms. Log ind i appen i stedet.' },
  { title: 'Brug en passkey', text: 'Så er der ingen adgangskode, der kan stjæles, og falske login-sider virker ikke.' }
];

export default function SecurityPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 pt-5 sm:px-6">
      <Breadcrumbs items={[{ label: 'Forside', href: '/' }, { label: 'Tryghed og sikkerhed' }]} />
      <h1 className="mt-6 text-h1 sm:text-[38px] sm:leading-[44px]">Tryghed og sikkerhed</h1>
      <p className="mt-3 text-[17px] leading-[26px] text-slate-700">Sådan holder vi pengene og dine oplysninger sikre.</p>

      <section aria-labelledby="flow-title" className="mt-12">
        <h2 id="flow-title" className="text-h2">Sådan virker køberbeskyttelsen</h2>
        <div className="mt-6 rounded-lg border border-line bg-surface p-6">
          <Timeline steps={[
            { title: 'Du betaler i appen', description: 'Pengene holdes sikkert – sælger får dem ikke endnu.', state: 'done' },
            { title: 'Sælger sender varen', description: 'Inden for 5 dage – ellers får du automatisk pengene tilbage.', state: 'done' },
            { title: 'Du modtager varen', description: 'Du har 48 timer til at godkende eller melde et problem.', state: 'now' },
            { title: 'Sælger får pengene', description: 'Når du godkender – eller automatisk efter 48 timer.' }
          ]} />
        </div>
      </section>

      <section aria-labelledby="tips-title" className="mt-12">
        <h2 id="tips-title" className="text-h2">Undgå svindel</h2>
        <ul className="mt-6 grid gap-4 sm:grid-cols-2">
          {TIPS.map((t) => (
            <li key={t.title} className="rounded-lg border border-line bg-surface p-5">
              <h3 className="text-h3">{t.title}</h3>
              <p className="mt-2 text-body text-slate-700">{t.text}</p>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="data-title" className="mt-12">
        <h2 id="data-title" className="text-h2">Dine data</h2>
        <ul className="mt-4 list-disc space-y-2 pl-5 text-body text-slate-700">
          <li>Vi gemmer ingen kort- eller bankoplysninger – det håndterer vores betalingspartner.</li>
          <li>Adgangskoder gemmes kun som en uigenkaldelig hash (Argon2id), og login kan beskyttes med passkey eller to-trins-login.</li>
          <li>Denne hjemmeside bruger ingen cookies og ingen sporing.</li>
        </ul>
        <div className="mt-6"><Notice icon="info">Har du fundet et sikkerhedsproblem? Meld det fortroligt via GitHubs private sårbarhedsrapportering på projektets repository.</Notice></div>
      </section>
    </div>
  );
}
