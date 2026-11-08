import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Notice } from '@respin/ui';
import { safeRedirectPath } from '@respin/security';
import { AuthPage, linkCls } from '../../components/AuthPage';
import { LoginForm } from '../../components/AuthForms';
import { getCurrentSession } from '../../lib/auth';

export const metadata = { title: 'Log ind' };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; reset?: string }> }) {
  const sp = await searchParams;
  const next = safeRedirectPath(sp.next, '/konto/');
  if (await getCurrentSession()) redirect(next);
  return (
    <AuthPage title="Log ind" intro="Log ind for at se dine handler, beskeder og favoritter.">
      {sp.reset && <Notice icon="check" role="status">Din adgangskode er ændret. Log ind med den nye.</Notice>}
      <LoginForm next={next} />
      <p className="text-small"><Link className={linkCls} href="/glemt-adgangskode/">Glemt adgangskode?</Link></p>
      <p className="border-t border-line pt-5 text-body text-slate-700">Ny på Videro? <Link className={linkCls} href="/opret-konto/">Opret en konto</Link></p>
    </AuthPage>
  );
}
