import Link from 'next/link';
import { AuthPage } from '../../components/AuthPage';
import { ResetForm } from '../../components/AuthForms';

export const metadata = { title: 'Ny adgangskode', referrer: 'no-referrer' };

export default async function ResetPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token = '' } = await searchParams;
  return (
    <AuthPage title="Vælg en ny adgangskode" back="/login">
      {token ? <ResetForm token={token} /> : <p>Linket mangler. <Link className="rs-t-link" href="/forgot-password">Bed om et nyt</Link>.</p>}
    </AuthPage>
  );
}
