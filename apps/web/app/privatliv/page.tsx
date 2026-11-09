import type { Metadata } from 'next';
import { pageMetadata } from '../../lib/seo';
import Link from 'next/link';
import { LegalPage } from '../../components/legal/LegalPage';
import { CompanyInfo } from '../../components/legal/CompanyInfo';

export const metadata: Metadata = pageMetadata({ title: 'Privatlivscenter', description: 'Sådan behandler Videro dine personoplysninger: hvad vi gemmer, hvorfor, hvor længe – og dine rettigheder.', path: '/privatliv/' });

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privatlivscenter"
      updated="9. november 2026"
      intro={<p>Her kan du læse, hvilke oplysninger Videro behandler om dig, hvorfor vi gør det, hvem vi deler dem med, og hvilke rettigheder du har. Vi indsamler så lidt som muligt og gemmer det ikke længere end nødvendigt.</p>}
      sections={[
        { id: 'dataansvarlig', title: 'Hvem er dataansvarlig', body: <>
          <p>Videro er dataansvarlig for de oplysninger, der behandles på platformen. Har du spørgsmål om dine data eller vil bruge dine rettigheder, så skriv til os:</p>
          <CompanyInfo />
        </> },
        { id: 'hvad', title: 'Hvilke oplysninger vi behandler', body: <>
          <ul>
            <li><b>Konto:</b> e-mail, visningsnavn, profilnavn, tekst om dig og valgt profilbanner.</li>
            <li><b>Login og sikkerhed:</b> din adgangskode gemmes kun som en Argon2id-hash (vi kan ikke se den). Vi gemmer også passkeys (kun den offentlige nøgle), krypteret to-trins-nøgle, gendannelseskoder som hash og aktive sessioner med IP-adresse, browser og tidspunkt.</li>
            <li><b>Annoncer:</b> titel, beskrivelse, pris, kategori og billeder. Billederne omkodes, inden de gemmes, så skjulte oplysninger som GPS-position og kameradata fjernes.</li>
            <li><b>Beskeder og bud:</b> indholdet af dine beskeder, bud og svar, tidspunkter og om beskeden er læst. Beskeder scannes automatisk for tegn på svindel (fx betaling uden om Videro), og resultatet (lav/høj risiko) gemmes.</li>
            <li><b>Notifikationer:</b> hvornår vi har sendt dig en mail om nye beskeder eller svar fra kundeservice.</li>
            <li><b>Forsendelse:</b> køberens valgte pakkeshop og leveringsadresse, sælgerens afsenderadresse og telefonnummer, sporingsnummer og sporingsstatus.</li>
            <li><b>Køb, betaling og udbetaling:</b> ordrer, beløb, status og levering. Kortoplysninger håndteres alene af Stripe og når aldrig vores servere. For at få udbetalt skal sælgere bekræfte deres identitet hos Stripe.</li>
            <li><b>Skatteoplysninger (DAC7):</b> for sælgere, der når 30 salg eller 2.000 euro om året: navn, adresse, fødselsdato, CPR-nummer, bankkonto, antal salg og beløb.</li>
            <li><b>Fremhævning:</b> hvilken annonce eller profil, hvilken pakke og betalingsstatus.</li>
            <li><b>Kundeservice, anmeldelser af annoncer og moderation:</b> dine henvendelser, anmeldelser du indsender, advarsler og afgørelser om din konto.</li>
            <li><b>Kun i din browser:</b> favoritter, sprogvalg og dit cookievalg gemmes lokalt hos dig og sendes ikke til os.</li>
          </ul>
        </> },
        { id: 'hvorfor', title: 'Hvorfor – og med hvilket grundlag', body: <>
          <table>
            <thead><tr><th scope="col">Formål</th><th scope="col">Retsgrundlag (GDPR)</th></tr></thead>
            <tbody>
              <tr><td>Oprette og drive din konto, vise dine annoncer og din profil</td><td>Aftale, art. 6, stk. 1, litra b</td></tr>
              <tr><td>Beskytte konti mod misbrug (rate limiting, sessioner, tjek af lækkede adgangskoder)</td><td>Legitim interesse, art. 6, stk. 1, litra f</td></tr>
              <tr><td>Gennemgå annoncer, der kan være svindel (fx betaling uden om platformen)</td><td>Legitim interesse, art. 6, stk. 1, litra f</td></tr>
              <tr><td>Sende og vise beskeder og bud, gennemføre køb, betaling, udbetaling og køberbeskyttelse</td><td>Aftale, art. 6, stk. 1, litra b</td></tr>
              <tr><td>Scanne beskeder og annoncer for svindel, behandle anmeldelser, advarsler og spærringer</td><td>Legitim interesse i en sikker markedsplads, art. 6, stk. 1, litra f, og retlig forpligtelse efter forordningen om digitale tjenester (DSA)</td></tr>
              <tr><td>Mails om nye beskeder og svar fra kundeservice</td><td>Aftale, art. 6, stk. 1, litra b (du kan slå dem fra ved at skrive til os)</td></tr>
              <tr><td>Indberetning af sælgere til Skattestyrelsen (DAC7), herunder CPR-nummer</td><td>Retlig forpligtelse, art. 6, stk. 1, litra c, og databeskyttelseslovens § 11 (CPR-nummer)</td></tr>
              <tr><td>Bogføring af betalinger</td><td>Retlig forpligtelse, art. 6, stk. 1, litra c (bogføringsloven)</td></tr>
            </tbody>
          </table>
          <p>Når du vælger en adgangskode, tjekker vi, om den findes i kendte datalæk. Kun de første fem tegn af en hash af adgangskoden sendes til tjenesten (k-anonymitet) – aldrig selve adgangskoden.</p>
        </> },
        { id: 'deling', title: 'Hvem vi deler med', body: <>
          <p>Vi sælger aldrig dine oplysninger. Vi bruger disse databehandlere, som kun må behandle oplysningerne efter vores instruks:</p>
          <ul>
            <li><b>Vercel Inc.</b> – hosting af hjemmesiden (servere i Frankfurt) og billedlager til annoncefotos.</li>
            <li><b>Neon Inc.</b> – database (servere i Frankfurt).</li>
            <li><b>Cloudflare Inc.</b> – beskyttelse mod angreb og hurtig levering af siden.</li>
            <li><b>Resend Inc.</b> – udsendelse af e-mails (bekræftelse, nulstilling af adgangskode og notifikationer).</li>
            <li><b>Shipmondo ApS</b> (Danmark) – fragtlabels og sporing. Får køberens navn, adresse, telefon, e-mail og valgte pakkeshop samt sælgerens afsenderadresse og telefon, og giver dem videre til fragtfirmaet (fx GLS), der leverer pakken.</li>
          </ul>
          <p><b>Stripe</b> (Stripe Payments Europe Ltd., Irland) håndterer betaling og udbetaling og er selvstændig dataansvarlig for identitetskontrol og forebyggelse af svindel og hvidvask – se <a href="https://stripe.com/dk/privacy" rel="noopener noreferrer">Stripes privatlivspolitik</a>.</p>
          <p>Når du handler, ser den anden part dit profilnavn og dine beskeder – og sælgeren får køberens navn og leveringsadresse til forsendelsen. Oplysninger om sælgere over DAC7-grænsen videregives til <b>Skattestyrelsen</b>. Vi videregiver også oplysninger til politiet og andre myndigheder, når loven kræver det.</p>
          <p>Udbyderne er amerikanske selskaber. Overførsler til USA sker på grundlag af EU-Kommissionens tilstrækkelighedsafgørelse om EU-U.S. Data Privacy Framework eller standardkontraktbestemmelser.</p>
        </> },
        { id: 'opbevaring', title: 'Hvor længe vi gemmer', body: <ul>
          <li>Sessioner udløber efter højst 30 dage – og efter 7 dage uden aktivitet.</li>
          <li>Links til bekræftelse og nulstilling virker i 24 timer og 30 minutter og kan kun bruges én gang.</li>
          <li>Kontooplysninger og annoncer gemmes, så længe du har en konto. Når du sletter din konto, slettes eller anonymiseres de, medmindre loven kræver, at vi gemmer dem.</li>
          <li>Beskeder og bud gemmes, så længe begge parters konti findes – højst 3 år efter den seneste besked i samtalen.</li>
          <li>Oplysninger om betalinger gemmes i 5 år efter regnskabsårets udløb (bogføringsloven).</li>
          <li>DAC7-oplysninger gemmes så længe, skattereglerne kræver.</li>
          <li>Advarsler og afgørelser om din konto gemmes, så længe kontoen findes, og 2 år efter, at den er lukket, så spærrede brugere ikke bare kan oprette sig igen.</li>
        </ul> },
        { id: 'rettigheder', title: 'Dine rettigheder', body: <>
          <p>Du har ret til at få indsigt i dine oplysninger, få dem rettet eller slettet, begrænse behandlingen, gøre indsigelse og få dine data udleveret (dataportabilitet). Profilnavn, tekst om dig og banner kan du selv rette under <Link href="/konto/">Min konto</Link>.</p>
          <p>Er du utilfreds med vores behandling, kan du klage til <a href="https://www.datatilsynet.dk" rel="noopener noreferrer">Datatilsynet</a>.</p>
        </> },
        { id: 'statistik', title: 'Statistik uden cookies', body: <>
          <p>For at gøre siden bedre tæller vi, hvilke sider og annoncer der bliver set, hvad der bliver søgt på, og hvilke knapper der bliver brugt. Det sker <b>uden cookies</b> og uden at gemme noget på din enhed.</p>
          <ul>
            <li>Vi gemmer siden, evt. annoncen, søgeordet, hvilket domæne du kom fra (fx google.com) og om du bruger mobil, tablet eller computer.</li>
            <li>Vi gemmer <b>ikke</b> din IP-adresse, din konto eller noget, der kan følge dig fra dag til dag. Til at tælle unikke besøgende samme dag bruger vi et kodet tal, der laves med et tilfældigt nøgletal, som skiftes og slettes hver nat.</li>
            <li>Grundlag: vores legitime interesse i at forbedre siden (GDPR art. 6, stk. 1, litra f). Oplysningerne slettes efter 13 måneder.</li>
            <li>Har din browser slået "Global Privacy Control" eller "Do Not Track" til, tæller vi slet ikke dine besøg.</li>
          </ul>
        </> },
        { id: 'cookies', title: 'Cookies', body: <p>Vi bruger kun det, der er nødvendigt for at siden virker. Læs mere i vores <Link href="/cookiepolitik/">cookiepolitik</Link>, og ret dit valg under <Link href="/cookieindstillinger/">cookieindstillinger</Link>.</p> }
      ]}
    />
  );
}
