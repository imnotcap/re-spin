import Link from 'next/link';
import { AuthPage } from '../../components/AuthPage';
import { SignupForm } from '../../components/AuthForms';

export const metadata = { title: 'Opret konto' };

export default function SignupPage() {
  return (
    <AuthPage title="Opret din konto" intro="Det er gratis at oprette annoncer.">
      <SignupForm />
      <p className="rs-t-muted">Har du allerede en konto? <Link className="rs-t-link" href="/login">Log ind</Link></p>
    </AuthPage>
  );
}
