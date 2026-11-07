import Link from 'next/link';
import { AuthPage, linkCls } from '../../components/AuthPage';
import { ForgotForm } from '../../components/AuthForms';

export const metadata = { title: 'Glemt adgangskode' };

export default function ForgotPage() {
  return (
    <AuthPage title="Glemt adgangskode" intro="Skriv din e-mail, så sender vi et link til at vælge en ny adgangskode.">
      <ForgotForm />
      <p className="text-small"><Link className={linkCls} href="/log-ind/">Tilbage til log ind</Link></p>
    </AuthPage>
  );
}
