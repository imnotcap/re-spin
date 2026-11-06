import Link from 'next/link';
import { AuthPage } from '../../components/AuthPage';
import { VerifyForm } from '../../components/AuthForms';

export const metadata = { title: 'Bekræft e-mail', referrer: 'no-referrer' };

/** Linket ændrer intet ved GET (mail-scannere "klikker" på links) – bekræftelse kræver adgangskode og en POST. */
export default async function VerifyPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token = '' } = await searchParams;
  return (
    <AuthPage title="Bekræft din e-mail" intro="Log ind med den adgangskode, du valgte, for at aktivere din konto.">
      {token ? <VerifyForm token={token} /> : <p>Linket mangler. <Link className="rs-t-link" href="/login">Log ind</Link> for at få et nyt.</p>}
    </AuthPage>
  );
}
