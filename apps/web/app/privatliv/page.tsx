import type { Metadata } from 'next';
import { pageMetadata } from '../../lib/seo';
import Link from 'next/link';
import { LegalPage } from '../../components/legal/LegalPage';

export const metadata: Metadata = pageMetadata({ title: 'Privatlivscenter', description: 'Sådan behandler Videro dine personoplysninger: hvad vi gemmer, hvorfor, hvor længe – og dine rettigheder.', path: '/privatliv/' });

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privatlivscenter"
      updated="7. november 2026"
      intro={<p>Her kan du læse, hvilke oplysninger Videro behandler om dig, hvorfor vi gør det, hvem vi deler dem med, og hvilke rettigheder du har. Vi indsamler så lidt som muligt og gemmer det ikke længere end nødvendigt.</p>}
      sections={[
        { id: 'dataansvarlig', title: 'Hvem er dataansvarlig', body: <>
          <p>Videro er dataansvarlig for de oplysninger, der behandles på platformen. Virksomhedens navn, CVR-nummer og adresse offentliggøres her, før platformen åbner for rigtige handler.</p>
          <p>Har du spørgsmål om dine data, kan du kontakte os via kontaktoplysningerne på denne side, når de er offentliggjort.</p>
        </> },
        { id: 'hvad', title: 'Hvilke oplysninger vi behandler', body: <>
          <ul>
            <li><b>Konto:</b> e-mail, visningsnavn, profilnavn, tekst om dig og valgt profilbanner.</li>
            <li><b>Login og sikkerhed:</b> din adgangskode gemmes kun som en Argon2id-hash (vi kan ikke se den). Vi gemmer også passkeys (kun den offentlige nøgle), krypteret to-trins-nøgle, gendannelseskoder som hash og aktive sessioner med IP-adresse, browser og tidspunkt.</li>
            <li><b>Annoncer:</b> titel, beskrivelse, pris, kategori og billeder. Billederne omkodes, inden de gemmes, så skjulte oplysninger som GPS-position og kameradata fjernes.</li>
            <li><b>Fremhævning:</b> hvilken annonce, hvilken pakke og betalingsstatus. Kortoplysninger håndteres alene af vores betalingsudbyder og når aldrig vores servere.</li>
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
              <tr><td>Bogføring af betalinger for fremhævning</td><td>Retlig forpligtelse, art. 6, stk. 1, litra c (bogføringsloven)</td></tr>
            </tbody>
          </table>
          <p>Når du vælger en adgangskode, tjekker vi, om den findes i kendte datalæk. Kun de første fem tegn af en hash af adgangskoden sendes til tjenesten (k-anonymitet) – aldrig selve adgangskoden.</p>
        </> },
        { id: 'deling', title: 'Hvem vi deler med', body: <>
          <p>Vi sælger aldrig dine oplysninger. Vi bruger disse databehandlere, som kun må behandle oplysningerne efter vores instruks:</p>
          <ul>
            <li><b>Hosting</b> af hjemmesiden (servere i Frankfurt).</li>
            <li><b>Database</b> (EU, Frankfurt).</li>
            <li><b>Billedlager</b> til annoncefotos (EU, Frankfurt).</li>
            <li><b>Udsendelse af e-mails</b> (bekræftelse, nulstilling af adgangskode).</li>
            <li><b>Betaling</b> af fremhævning (betalingsudbyder).</li>
          </ul>
          <p>Hvis en udbyder overfører oplysninger til et land uden for EU/EØS, sker det på grundlag af EU-Kommissionens standardkontraktbestemmelser eller en tilstrækkelighedsafgørelse.</p>
        </> },
        { id: 'opbevaring', title: 'Hvor længe vi gemmer', body: <ul>
          <li>Sessioner udløber efter højst 30 dage – og efter 7 dage uden aktivitet.</li>
          <li>Links til bekræftelse og nulstilling virker i 24 timer og 30 minutter og kan kun bruges én gang.</li>
          <li>Kontooplysninger og annoncer gemmes, så længe du har en konto. Når du sletter din konto, slettes eller anonymiseres de, medmindre loven kræver, at vi gemmer dem.</li>
          <li>Oplysninger om betalinger gemmes i 5 år efter regnskabsårets udløb (bogføringsloven).</li>
        </ul> },
        { id: 'rettigheder', title: 'Dine rettigheder', body: <>
          <p>Du har ret til at få indsigt i dine oplysninger, få dem rettet eller slettet, begrænse behandlingen, gøre indsigelse og få dine data udleveret (dataportabilitet). Profilnavn, tekst om dig og banner kan du selv rette under <Link href="/konto/">Min konto</Link>.</p>
          <p>Er du utilfreds med vores behandling, kan du klage til <a href="https://www.datatilsynet.dk" rel="noopener noreferrer">Datatilsynet</a>.</p>
        </> },
        { id: 'cookies', title: 'Cookies', body: <p>Vi bruger kun det, der er nødvendigt for at siden virker. Læs mere i vores <Link href="/cookiepolitik/">cookiepolitik</Link>, og ret dit valg under <Link href="/cookieindstillinger/">cookieindstillinger</Link>.</p> }
      ]}
    />
  );
}
