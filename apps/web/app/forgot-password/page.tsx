import { AuthPage } from '../../components/AuthPage';
import { ForgotForm } from '../../components/AuthForms';

export const metadata = { title: 'Glemt adgangskode' };

export default function ForgotPage() {
  return (
    <AuthPage title="Glemt adgangskode" intro="Skriv din e-mail, så sender vi et link til at vælge en ny." back="/login">
      <ForgotForm />
    </AuthPage>
  );
}
