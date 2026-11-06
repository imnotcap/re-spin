import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Notice } from '@respin/ui';
import { safeRedirectPath } from '@respin/security';
import { AuthPage } from '../../components/AuthPage';
import { LoginForm } from '../../components/AuthForms';
import { getCurrentSession } from '../../lib/auth';

export const metadata = { title: 'Log ind' };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; reset?: string }> }) {
  const sp = await searchParams;
  const next = safeRedirectPath(sp.next, '/account');
  if (await getCurrentSession()) redirect(next);
  return (
    <AuthPage title="Velkommen tilbage" intro="Log ind for at se dine beskeder og handler.">
      {sp.reset && <Notice icon="check" role="status">Din adgangskode er ændret. Log ind med den nye.</Notice>}
      <LoginForm next={next} />
      <p className="rs-t-small"><Link className="rs-t-link" href="/forgot-password">Glemt adgangskode?</Link></p>
      <p className="rs-t-muted">Ny her? <Link className="rs-t-link" href="/signup">Opret konto</Link></p>
    </AuthPage>
  );
}
