import type { Metadata } from 'next';
import { pageMetadata } from '../../lib/seo';
import Link from 'next/link';
import { LegalPage } from '../../components/legal/LegalPage';

export const metadata: Metadata = pageMetadata({ title: 'Vores platform', description: 'Hvad Videro er, hvordan vi gør det trygt at handle brugt – og hvem der står bag teksterne, fotoene og skrifttypen.', path: '/om/' });

export default function AboutPage() {
  return (
    <LegalPage
      title="Vores platform"
      updated="7. november 2026"
      draft={false}
      intro={<p>Videro er en dansk markedsplads for brugt tøj, sko, tasker og ting til hjemmet. Vi vil gøre det nemt og trygt at give ting et nyt liv – med en ærlig pris på hver vare og køberbeskyttelse på alle køb.</p>}
      sections={[
        { id: 'sadan', title: 'Sådan fungerer det', body: <ul>
          <li><b>Sælg gratis:</b> tag billeder, skriv en pris, og din vare er til salg på få minutter. Du betaler først et lille gebyr, når den er solgt.</li>
          <li><b>Køb trygt:</b> pengene holdes, til du har modtaget varen. Prisen inkl. køberbeskyttelse står altid på varen.</li>
          <li><b>Bliv set:</b> vil du sælge hurtigere, kan du fremhæve din annonce i en periode.</li>
        </ul> },
        { id: 'tryghed', title: 'Tryghed og sikkerhed', body: <ul>
          <li>Login med passkey eller to-trins-login, og vi advarer, hvis en adgangskode findes i kendte datalæk.</li>
          <li>Billeder renses for skjulte oplysninger som GPS-position, før de vises.</li>
          <li>Annoncer, der lægger op til betaling uden om platformen, gennemgås, før de vises.</li>
          <li>Ingen cookies til sporing eller reklamer. Læs mere i <Link href="/privatliv/">Privatlivscenter</Link>.</li>
        </ul> },
        { id: 'baeredygtighed', title: 'Hvorfor brugt?', body: <p>Det mest bæredygtige tøj er det, der allerede findes. Hver gang en jakke, en taske eller en lampe får en ny ejer, er der én ting mindre, der skal produceres.</p> },
        { id: 'kreditering', title: 'Fotos, skrift og kreditering', body: <ul>
          <li>Fotos i testversionen er fra Unsplash og bruges efter Unsplash-licensen.</li>
          <li>Skrifttypen er Inter (Rasmus Andersson) under SIL Open Font License 1.1.</li>
          <li>Den roterende tekst på forsiden bygger på en komponent fra React Bits (MIT + Commons Clause).</li>
        </ul> }
      ]}
    />
  );
}
