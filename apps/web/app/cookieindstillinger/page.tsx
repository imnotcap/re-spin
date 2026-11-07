import type { Metadata } from 'next';
import Link from 'next/link';
import { LegalPage } from '../../components/legal/LegalPage';
import { CookieSettings } from '../../components/consent/CookieSettings';

export const metadata: Metadata = { title: 'Cookieindstillinger', description: 'Se og ændr, hvilke cookies re:spin må bruge.' };

export default function CookieSettingsPage() {
  return (
    <LegalPage
      title="Cookieindstillinger"
      updated="7. november 2026"
      draft={false}
      intro={<p>Her kan du altid se og ændre dit valg. Nødvendige cookies kan ikke slås fra, fordi siden ikke virker uden dem. Læs hvad vi gemmer i <Link href="/cookiepolitik/" className="font-semibold text-forest underline underline-offset-2">cookiepolitikken</Link>.</p>}
      sections={[]}
    >
      <CookieSettings />
    </LegalPage>
  );
}
