import type { Metadata } from 'next';
import { pageMetadata } from '../../lib/seo';
import Link from 'next/link';
import { LegalPage } from '../../components/legal/LegalPage';
import { PROMOTION_PACKAGES } from '../../lib/promotion-packages';
import { formatOre, ore } from '@respin/core/money';

export const metadata: Metadata = pageMetadata({ title: 'Vilkår og betingelser', description: 'Vilkårene for at købe og sælge på Videro: konto, annoncer, gebyrer, køberbeskyttelse og fremhævning.', path: '/vilkaar/' });

export default function TermsPage() {
  return (
    <LegalPage
      title="Vilkår og betingelser"
      updated="7. november 2026"
      intro={<p>Vilkårene gælder for alle, der bruger Videro. Når du opretter en konto, accepterer du dem. Videro er en markedsplads: handlen sker mellem køber og sælger, og vi stiller platformen, betalingen og køberbeskyttelsen til rådighed.</p>}
      sections={[
        { id: 'konto', title: '1. Din konto', body: <ul>
          <li>Du skal være mindst 18 år, eller have forældres samtykke, og må kun have én konto.</li>
          <li>Oplysningerne skal være korrekte, og du er ansvarlig for alt, der sker på din konto. Brug en stærk adgangskode – gerne passkey eller to-trins-login.</li>
          <li>Dit profilnavn må ikke udgive sig for at være andre, Videro eller vores medarbejdere.</li>
        </ul> },
        { id: 'annoncer', title: '2. Annoncer', body: <ul>
          <li>Du må kun sælge ting, du ejer, og som du har ret til at sælge. Kopivarer, ulovlige varer, våben, medicin og levende dyr er ikke tilladt.</li>
          <li>Beskrivelse, billeder, stand og størrelse skal være retvisende. Fejl og slid skal fremgå.</li>
          <li>Annoncer, der henviser til betaling uden om Videro, gennemgås, før de vises – og kan blive afvist. Uden om platformen er der ingen køberbeskyttelse.</li>
          <li>Du giver Videro ret til at vise dine annoncer og billeder på platformen, så længe annoncen er aktiv.</li>
        </ul> },
        { id: 'gebyrer', title: '3. Gebyrer', body: <>
          <p>Det er gratis at sætte til salg. Når en vare er solgt, betaler sælgeren 1 % (0,5 % som certificeret sælger). Køberen betaler køberbeskyttelse (5 % + 3 kr.) og fragt. Alle priser vises, før du køber. Se <Link href="/gebyrer/">gebyrer</Link>.</p>
        </> },
        { id: 'beskyttelse', title: '4. Køberbeskyttelse', body: <p>Pengene holdes, til køberen har modtaget varen. Er varen ikke som beskrevet, kan køberen inden for 48 timer efter levering melde det, og vi hjælper med at finde en løsning, herunder returnering og refusion. Læs mere under <Link href="/sikkerhed/">køberbeskyttelse</Link>.</p> },
        { id: 'fremhaevning', title: '5. Fremhævning af annoncer', body: <>
          <p>Du kan købe fremhævning af din egen annonce, så den vises øverst og med mærket «Fremhævet» i en periode:</p>
          <ul>{PROMOTION_PACKAGES.map((p) => <li key={p.id}>{p.label}: {formatOre(ore(p.priceOre))}</li>)}</ul>
          <p>Perioden starter, når betalingen er gennemført. Fremhævningen er en digital ydelse, der leveres med det samme; når den er startet, er der ikke fortrydelsesret, og den refunderes ikke, hvis du selv fjerner eller sælger annoncen. Afviser vi annoncen, refunderer vi den ubrugte del.</p>
        </> },
        { id: 'adfaerd', title: '6. God opførsel og misbrug', body: <p>Chikane, svindel, falske anmeldelser og forsøg på at omgå sikkerheden er forbudt. Vi kan fjerne indhold og lukke konti, der bryder vilkårene. Mistænker vi svindel, kan vi tilbageholde udbetalinger, mens sagen undersøges.</p> },
        { id: 'ansvar', title: '7. Ansvar', body: <p>Videro er ikke part i handlen mellem køber og sælger, men står for platform, betaling og køberbeskyttelse som beskrevet her. Vi gør vores bedste for, at siden altid virker, men kan ikke garantere, at den er uden afbrydelser.</p> },
        { id: 'lov', title: '8. Ændringer, lovvalg og klager', body: <>
          <p>Vi kan ændre vilkårene med mindst 30 dages varsel. Dansk ret gælder. Er du forbruger og utilfreds, kan du klage til os og derefter til Center for Klageløsning via <a href="https://www.forbrug.dk" rel="noopener noreferrer">forbrug.dk</a>.</p>
          <p>Se også <Link href="/privatliv/">Privatlivscenter</Link> og <Link href="/cookiepolitik/">cookiepolitikken</Link>.</p>
        </> }
      ]}
    />
  );
}
