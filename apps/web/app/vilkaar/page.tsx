import type { Metadata } from 'next';
import { pageMetadata } from '../../lib/seo';
import Link from 'next/link';
import { LegalPage } from '../../components/legal/LegalPage';
import { CompanyInfo } from '../../components/legal/CompanyInfo';
import { PROFILE_PROMOTION_PACKAGES, PROMOTION_PACKAGES } from '@respin/core/promotions';
import { formatOre, ore } from '@respin/core/money';
import { OFFER_HOURS, OFFER_MIN_SHARE } from '../../lib/offer-rules';

export const metadata: Metadata = pageMetadata({ title: 'Vilkår og betingelser', description: 'Vilkårene for at købe og sælge på Videro: Videros rolle, betaling, køberbeskyttelse, udbetaling, skat, moderation, fremhævning og klager.', path: '/vilkaar/' });

/**
 * Brugervilkår. Opbygget efter: e-handelsloven § 7, forbrugeraftaleloven (fortrydelsesret for fremhævning),
 * markedsføringsloven §§ 6 og 6 a (onlinemarkedspladser, rangering, betalt placering), DSA art. 14, 16, 17 og 20
 * (vilkår, anmeldelser, begrundelser, klager), DAC7 (BEK nr. 1253 af 06/09/2022) og Stripe Connect.
 * Skal gennemgås af en dansk advokat før lancering.
 */
export default function TermsPage() {
  return (
    <LegalPage
      title="Vilkår og betingelser"
      updated="9. november 2026"
      intro={<p>Vilkårene gælder for alle, der bruger Videro. Du accepterer dem, når du opretter en konto. Videro er en <b>markedsplads for private</b>: handlen sker mellem køber og sælger, og Videro stiller platformen, betalingen gennem vores betalingsudbyder og køberbeskyttelsen til rådighed.</p>}
      sections={[
        { id: 'hvem', title: '1. Hvem er vi', body: <>
          <p>Videro drives af virksomheden nedenfor. Du kan altid kontakte os – også som myndighed (kontaktpunkt efter EU&apos;s forordning om digitale tjenester) – på e-mailadressen. Vi svarer på dansk og engelsk.</p>
          <CompanyInfo />
        </> },
        { id: 'rolle', title: '2. Videros rolle – og dine rettigheder', body: <ul>
          <li><b>Videro er ikke sælger.</b> Køber og sælger indgår aftalen direkte med hinanden. Videro er ikke part i købet og ejer ikke varerne.</li>
          <li><b>Kun private sælgere.</b> Du må kun sælge ting, du har købt og brugt privat. Du må ikke sælge som led i en virksomhed eller købe varer for at sælge dem videre. Erhvervsdrivende må ikke bruge Videro til at sælge.</li>
          <li><b>Køb fra en privatperson:</b> Fordi sælgeren er privat, gælder forbrugerkøbsloven og den lovbestemte fortrydelsesret <b>ikke</b> mellem køber og sælger. Det fremgår også, før du køber. Til gengæld har du Videros køberbeskyttelse (afsnit 5).</li>
          <li><b>Mellem dig og Videro</b> er du forbruger, når du betaler os (køberbeskyttelse og fremhævning), og dine ufravigelige forbrugerrettigheder gælder.</li>
        </ul> },
        { id: 'konto', title: '3. Din konto', body: <ul>
          <li>Du skal være fyldt 18 år og må kun have én konto. Konti kan ikke overdrages.</li>
          <li>Dine oplysninger skal være korrekte, og du er ansvarlig for, hvad der sker på din konto. Brug en stærk adgangskode – gerne passkey eller to-trins-login.</li>
          <li>Dit profilnavn må ikke udgive sig for at være andre, Videro eller vores medarbejdere.</li>
          <li>Du kan altid lukke din konto. Igangværende handler skal dog afsluttes først.</li>
        </ul> },
        { id: 'annoncer', title: '4. Annoncer og forbudte varer', body: <>
          <ul>
            <li>Du må kun sælge ting, du ejer og har ret til at sælge. Beskrivelse, billeder, stand og størrelse skal være retvisende, og fejl og slid skal fremgå.</li>
            <li>Forbudt: kopivarer og varemærkeforfalskninger, ulovlige og stjålne varer, våben og ammunition, medicin, kosttilskud og kosmetik, der er åbnet eller udløbet, alkohol og tobak, levende dyr, tilbagekaldte produkter samt varer, der krænker andres rettigheder.</li>
            <li>Henviser en annonce eller besked til betaling uden om Videro (fx MobilePay, bankoverførsel eller telefonnummer), gennemgås den manuelt og kan blive afvist. Uden om Videro er der ingen køberbeskyttelse.</li>
            <li>Du giver Videro en gratis, ikke-eksklusiv ret til at vise dine annoncer, billeder og din profil på platformen og i vores markedsføring af platformen, så længe annoncen er aktiv.</li>
          </ul>
        </> },
        { id: 'koeb', title: '5. Køb, betaling og køberbeskyttelse', body: <>
          <ul>
            <li><b>Pris:</b> Du ser altid den samlede pris, før du betaler: varens pris + køberbeskyttelse (5 % af prisen + 3 kr., inkl. moms) + fragt. Prisen inkl. køberbeskyttelse vises allerede på varekortet og annoncen.</li>
            <li><b>Betaling</b> håndteres af vores betalingsudbyder Stripe. Kortoplysninger når aldrig Videros servere. Pengene holdes hos Stripe – ikke på en konto hos Videro – til handlen er gennemført.</li>
            <li><b>Køberbeskyttelse</b> er en ydelse fra Videro (ikke en forsikring): Kommer varen ikke frem, eller er den væsentligt anderledes end beskrevet, kan du melde det inden for 48 timer efter levering. Så holder vi pengene tilbage, hjælper med returnering og refunderer købsprisen, fragten og køberbeskyttelsen, når sagen er afgjort i din favør. Melder du ikke noget inden for 48 timer, regnes varen for godkendt.</li>
            <li>Køberbeskyttelsen gælder kun køb, der er betalt på Videro.</li>
          </ul>
          <p>Læs mere under <Link href="/sikkerhed/">køberbeskyttelse</Link>.</p>
        </> },
        { id: 'bud', title: '6. Bud og beskeder', body: <ul>
          <li>Du kan give et bud på mindst {Math.round(OFFER_MIN_SHARE * 100)} % af prisen. Et bud gælder i {OFFER_HOURS} timer og kan trækkes tilbage, indtil sælgeren har svaret.</li>
          <li>Accepterer sælgeren, er prisen aftalt, men købet er først bindende, når du har betalt på Videro.</li>
          <li>Beskeder må kun handle om handlen. Vi scanner beskeder automatisk for svindel (fx betaling uden om Videro) og kan vise en advarsel eller gennemgå dem manuelt. Vi læser ikke dine beskeder uden grund.</li>
        </ul> },
        { id: 'udbetaling', title: '7. Udbetaling til sælgere – og hvornår vi kan tilbageholde penge', body: <>
          <ul>
            <li>For at få udbetalt skal du oprette en udbetalingskonto hos Stripe og bekræfte din identitet. Stripe stiller krav efter hvidvaskloven og kan bede om dokumentation. Ved at oprette kontoen accepterer du <a href="https://stripe.com/dk/legal/connect-account" rel="noopener noreferrer">Stripe Connected Account Agreement</a>, som omfatter <a href="https://stripe.com/dk/legal/ssa" rel="noopener noreferrer">Stripe Services Agreement</a>. Du giver Videro lov til at dele de oplysninger med Stripe, der er nødvendige for betaling og udbetaling.</li>
            <li>Stripe kan når som helst – også senere, når du har solgt mere – bede om flere oplysninger, fx billede af legitimation eller dokumentation for adresse, og tjekker mod EU&apos;s sanktionslister. Indtil oplysningerne er godkendt, kan Stripe sætte udbetalinger på pause. Videro gemmer ikke kopier af din legitimation; den sendes direkte til Stripe.</li>
            <li>Det er forbudt at bruge Videro til at flytte penge uden en reel handel – fx fiktive salg, køb af egne varer eller betaling for andet end den annoncerede vare. Vi kan anmelde mistanke om strafbare forhold til politiet.</li>
            <li>Pengene sendes til din Stripe-konto, når køberen har godkendt varen – eller automatisk 48 timer efter levering, hvis køberen ikke har meldt et problem. Stripe overfører derefter til din bankkonto.</li>
            <li><b>Vi kan tilbageholde en udbetaling</b>, så længe det er nødvendigt, hvis: køberen har meldt et problem; der er begrundet mistanke om svindel, hvidvask eller brud på vilkårene; en betaling bliver tilbageført (chargeback); Stripe kræver det, eller dine identitets- eller skatteoplysninger mangler (afsnit 8).</li>
            <li>Tilbageholder vi penge eller begrænser din konto, får du altid en skriftlig begrundelse med de fakta, vi bygger på, og hvordan du klager (afsnit 10) – medmindre politiet eller loven forbyder det. Pengene frigives, så snart grunden er væk.</li>
          </ul>
        </> },
        { id: 'skat', title: '8. Skat og indberetning til Skattestyrelsen (DAC7)', body: <>
          <ul>
            <li>Videro skal efter EU&apos;s DAC7-regler (bekendtgørelse nr. 1253 af 6. september 2022) indberette oplysninger om sælgere, der i et kalenderår har <b>30 salg eller flere</b> eller samlet har fået <b>mere end 2.000 euro</b> (ca. 14.900 kr.) for deres salg.</li>
            <li>Når du nærmer dig grænsen, beder vi om dit navn, adresse, fødselsdato, CPR-nummer (skatte-ID) og din bankkonto. Indberetningen sker hvert år senest 31. januar, og du får besked, før vi indberetter.</li>
            <li>Får vi ikke oplysningerne efter to påmindelser og tidligst 60 dage efter første anmodning, skal vi efter reglerne tilbageholde dine udbetalinger eller lukke kontoen, til oplysningerne er modtaget.</li>
            <li>Salg af egne brugte ting er som udgangspunkt skattefrit i Danmark. Sælger du regelmæssigt med fortjeneste eller køber for at sælge videre, kan det være skattepligtig virksomhed. Du er selv ansvarlig for din skat – se <a href="https://skat.dk" rel="noopener noreferrer">skat.dk</a>.</li>
          </ul>
        </> },
        { id: 'regler', title: '9. God opførsel og moderation', body: <>
          <p>Chikane, svindel, falske anmeldelser, flere konti og forsøg på at omgå sikkerheden eller betalingen er forbudt.</p>
          <ul>
            <li><b>Anmeld ulovligt indhold:</b> Med en konto kan du bruge knappen «Anmeld» på annoncen. Alle andre – også rettighedshavere og myndigheder – kan skrive til e-mailadressen i afsnit 1. Skriv hvorfor, og hvor indholdet er. Vi behandler anmeldelser hurtigt og omhyggeligt og giver besked om, hvad vi har gjort.</li>
            <li><b>Det kan vi gøre:</b> skjule eller fjerne annoncer, vise advarsler, give en skriftlig advarsel, begrænse eller midlertidigt spærre funktioner, tilbageholde udbetalinger (afsnit 7) og i alvorlige eller gentagne tilfælde lukke kontoen. Vi vælger det mildeste, der er tilstrækkeligt.</li>
            <li>Vi bruger automatiske filtre til at finde mulig svindel. Afgørelser om at fjerne annoncer eller spærre konti træffes eller efterprøves af et menneske.</li>
            <li>Ved hver afgørelse får du en begrundelse: hvad vi har gjort, hvilke fakta og hvilken regel det bygger på, om det skete automatisk, og hvordan du klager.</li>
          </ul>
        </> },
        { id: 'klage', title: '10. Klager', body: <>
          <ul>
            <li><b>Over en afgørelse fra os</b> (fjernet annonce, advarsel, spærring, tilbageholdt udbetaling): skriv til kundeservice under <Link href="/konto/support/">Min konto → Kundeservice</Link> inden for 6 måneder. En medarbejder, der ikke traf afgørelsen, gennemgår sagen, og du får et begrundet svar.</li>
            <li><b>Over en handel:</b> kontakt først den anden part via beskeder. Kan I ikke blive enige, så meld problemet inden for 48 timer efter levering, så hjælper vi (afsnit 5).</li>
            <li><b>Over Videros betalte ydelser</b> (køberbeskyttelse, fremhævning): klag til os. Er du forbruger, kan du derefter klage til Nævnenes Hus / Center for Klageløsning via <a href="https://www.forbrug.dk" rel="noopener noreferrer">forbrug.dk</a>. Forbruger Europa hjælper ved tvister med en sælger i et andet EU-land.</li>
          </ul>
        </> },
        { id: 'rangering', title: '11. Sådan sorterer vi varer', body: <>
          <p>Standardsorteringen er <b>nyeste først</b>. Annoncer, som sælgeren har betalt for at fremhæve, vises før de øvrige og er altid tydeligt mærket «Fremhævet». «Populære» sorteres efter antal visninger de seneste 30 dage. I søgning og kategorier kan du selv vælge sortering (fx pris) og filtre (størrelse, stand, pris og mærke). Fremhævede sælgere på forsiden er betalt placering og mærket «Fremhævet». Vi bruger ikke dine personlige data til at sortere varer.</p>
        </> },
        { id: 'anmeldelser', title: '12. Anmeldelser', body: <p>Kun den køber og sælger, der har gennemført en betalt handel på Videro, kan anmelde hinanden – én gang pr. handel. Vi fjerner ikke negative anmeldelser, fordi de er negative, men kun hvis de bryder vilkårene (fx chikane eller personoplysninger). Videro betaler ikke for anmeldelser.</p> },
        { id: 'fremhaevning', title: '13. Fremhævning af annoncer og profiler', body: <>
          <p>Du kan købe fremhævning af din egen annonce, så den vises øverst med mærket «Fremhævet». Certificerede sælgere betaler den lave pris. Priserne er inkl. moms:</p>
          <ul>{PROMOTION_PACKAGES.map((p) => <li key={p.id}>{p.label}: {formatOre(ore(p.priceOre))} (certificeret: {formatOre(ore(p.certifiedPriceOre))})</li>)}</ul>
          <p>Du kan også fremhæve din profil, så du vises under «Fremhævede sælgere» på forsiden med dine nyeste varer. Det kræver mindst én vare til salg:</p>
          <ul>{PROFILE_PROMOTION_PACKAGES.map((p) => <li key={p.id}>{p.label}: {formatOre(ore(p.priceOre))} (certificeret: {formatOre(ore(p.certifiedPriceOre))})</li>)}</ul>
          <p><b>Fortrydelsesret:</b> Fremhævning er en tjenesteydelse, der starter med det samme, når betalingen er gennemført. Før du betaler, beder vi dig udtrykkeligt bekræfte, at du ønsker, at den starter med det samme, og at du derved mister din fortrydelsesret på 14 dage, når ydelsen er fuldt leveret. Fjerner eller sælger du selv annoncen, refunderer vi ikke resten af perioden. Fjerner vi annoncen eller lukker kontoen uden at du har brudt vilkårene, refunderer vi den ubrugte del.</p>
        </> },
        { id: 'ansvar', title: '14. Ansvar', body: <>
          <p>Videro er ikke part i handlen og er ikke ansvarlig for varens stand, ægthed eller lovlighed – det er sælgeren. Vores ansvar er at levere platformen, betalingen og køberbeskyttelsen som beskrevet her. Vi gør vores bedste for, at siden altid virker, men kan ikke garantere, at den er uden afbrydelser. Vi er ikke ansvarlige for indirekte tab. Ansvarsbegrænsningerne gælder ikke ved forsæt eller grov uagtsomhed og begrænser ikke dine ufravigelige rettigheder som forbruger.</p>
        </> },
        { id: 'aendringer', title: '15. Ændringer, opsigelse og lovvalg', body: <>
          <ul>
            <li>Vi kan ændre vilkårene med mindst 30 dages varsel via e-mail og på siden. Væsentlige ændringer beskrives kort. Vil du ikke acceptere dem, kan du lukke din konto før ikrafttrædelsen.</li>
            <li>Vi kan opsige din konto med 30 dages varsel og uden varsel ved væsentlig misligholdelse (afsnit 9). Allerede betalte handler gennemføres eller refunderes.</li>
            <li>Dansk ret gælder. Er du forbruger med bopæl i et andet EU-land, bevarer du den beskyttelse, du har efter loven i dit land.</li>
          </ul>
          <p>Se også <Link href="/privatliv/">Privatlivscenter</Link> og <Link href="/cookiepolitik/">cookiepolitikken</Link>.</p>
        </> }
      ]}
    />
  );
}
