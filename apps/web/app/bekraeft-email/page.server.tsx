import Link from 'next/link';
import { AuthPage, linkCls } from '../../components/AuthPage';
import { VerifyForm } from '../../components/AuthForms';

export const metadata = { title: 'Bekræft e-mail', referrer: 'no-referrer' };

/** Linket ændrer intet ved GET (mail-scannere "klikker" på links) – bekræftelse kræver adgangskode og en POST. */
export default async function VerifyPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token = '' } = await searchParams;
  return (
    <AuthPage title="Bekræft din e-mail" intro="Skriv den adgangskode, du valgte, for at aktivere din konto.">
      {token ? <VerifyForm token={token} /> : <p className="text-body">Linket mangler. <Link className={linkCls} href="/log-ind/">Log ind</Link> for at få et nyt.</p>}
    </AuthPage>
  );
}
