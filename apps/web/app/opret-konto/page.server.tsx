import Link from 'next/link';
import { AuthPage, linkCls } from '../../components/AuthPage';
import { SignupForm } from '../../components/AuthForms';

export const metadata = { title: 'Opret konto' };

export default function SignupPage() {
  return (
    <AuthPage title="Opret din konto" intro="Det er gratis at oprette en konto og at sætte varer til salg.">
      <SignupForm />
      <p className="text-small text-muted">Vi bruger kun din e-mail til login og beskeder om dine handler.</p>
      <p className="border-t border-line pt-5 text-body text-slate-700">Har du allerede en konto? <Link className={linkCls} href="/log-ind/">Log ind</Link></p>
    </AuthPage>
  );
}
