import type { Metadata } from 'next';
import { pageMetadata } from '../../lib/seo';
import Link from 'next/link';
import { LegalPage } from '../../components/legal/LegalPage';
import { CONSENT_MAX_AGE_DAYS } from '../../lib/consent-policy';

export const metadata: Metadata = pageMetadata({ title: 'Cookiepolitik', description: 'Hvilke cookies og hvilken lokal lagring Videro bruger – og hvordan du ændrer dit valg.', path: '/cookiepolitik/' });

export default function CookiePolicyPage() {
  return (
    <LegalPage
      title="Cookiepolitik"
      updated="8. november 2026"
      intro={<p>En cookie er en lille fil, som hjemmesiden gemmer i din browser. Ud over cookies kan siden gemme små oplysninger lokalt i browseren (local storage). Her er alt, Videro gemmer – og hvorfor.</p>}
      sections={[
        { id: 'kort', title: 'Kort fortalt', body: <ul>
          <li>Vi bruger kun det, der er nødvendigt for, at siden virker, og for at huske de valg, du selv træffer.</li>
          <li>Vi bruger <b>ingen</b> cookies til statistik eller markedsføring, og ingen tredjeparter sætter cookies via Videro.</li>
          <li>Vores egen besøgsstatistik bruger hverken cookies eller lokal lagring – se <a href="/privatliv/#statistik">Statistik uden cookies</a>.</li>
          <li>Tager vi cookies til statistik eller markedsføring i brug, sker det kun, hvis du har sagt ja. Dit valg respekteres allerede nu.</li>
        </ul> },
        { id: 'liste', title: 'Det gemmer vi', body: (
          <div className="overflow-x-auto">
            <table>
              <thead><tr><th scope="col">Navn</th><th scope="col">Type</th><th scope="col">Formål</th><th scope="col">Varighed</th></tr></thead>
              <tbody>
                <tr><td><code>__Host-videro_session</code></td><td>Cookie, nødvendig</td><td>Holder dig logget ind. Kan ikke læses af JavaScript og sendes kun over HTTPS til Videro.</td><td>Højst 30 dage (7 dage uden aktivitet)</td></tr>
                <tr><td><code>videro.consent</code></td><td>Local storage, nødvendig</td><td>Husker dit cookievalg, så vi ikke spørger igen.</td><td>{CONSENT_MAX_AGE_DAYS / 30} måneder</td></tr>
                <tr><td><code>videro:favoritter</code></td><td>Local storage, nødvendig</td><td>Dine favoritter (gemmes kun hos dig, når du trykker på hjertet).</td><td>Til du sletter dem</td></tr>
                <tr><td><code>videro.lang</code></td><td>Local storage, nødvendig</td><td>Det sprog, du har valgt.</td><td>Til du vælger igen</td></tr>
              </tbody>
            </table>
          </div>
        ) },
        { id: 'aendre', title: 'Ændr eller træk dit samtykke tilbage', body: <p>Du kan altid ændre dit valg under <Link href="/cookieindstillinger/">cookieindstillinger</Link> eller slette cookies og lokal lagring i din browsers indstillinger. Sletter du login-cookien, bliver du logget ud.</p> },
        { id: 'mere', title: 'Mere om dine data', body: <p>Læs om resten af vores behandling af personoplysninger i <Link href="/privatliv/">Privatlivscenter</Link>.</p> }
      ]}
    />
  );
}
