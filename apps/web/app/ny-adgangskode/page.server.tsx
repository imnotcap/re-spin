import Link from 'next/link';
import { AuthPage, linkCls } from '../../components/AuthPage';
import { ResetForm } from '../../components/AuthForms';

export const metadata = { title: 'Ny adgangskode', referrer: 'no-referrer' };

export default async function ResetPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token = '' } = await searchParams;
  return (
    <AuthPage title="Vælg en ny adgangskode">
      {token ? <ResetForm token={token} /> : <p className="text-body">Linket mangler. <Link className={linkCls} href="/glemt-adgangskode/">Bed om et nyt</Link>.</p>}
    </AuthPage>
  );
}
