'use client';

import { useActionState } from 'react';
import { Button, Field, Notice } from '@respin/ui';
import { changePasswordAction, forgotPasswordAction, resetPasswordAction, signInAction, signUpAction, verifyEmailAction, type FormState } from '../app/actions';

const Error = ({ state }: { state: FormState }) => (state?.error ? <Notice icon="info" warn role="alert" data-testid="form-error">{state.error}</Notice> : null);
const form = { display: 'flex', flexDirection: 'column', gap: 16 } as const;

export function LoginForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState(signInAction, undefined);
  return (
    <form action={action} style={form} noValidate>
      <Error state={state} />
      <input type="hidden" name="next" value={next} />
      <Field label="E-mail" name="email" type="email" icon="mail" autoComplete="username" required defaultValue={state?.values?.email} />
      <Field label="Adgangskode" name="password" type="password" icon="lock" autoComplete="current-password" required />
      <Button type="submit" size="lg" full disabled={pending}>{pending ? 'Logger ind…' : 'Log ind'}</Button>
    </form>
  );
}

export function SignupForm() {
  const [state, action, pending] = useActionState(signUpAction, undefined);
  if (state?.done) return <Notice icon="mail" role="status"><b>Tjek din indbakke.</b> Vi har sendt et link, så du kan bekræfte din e-mail. Linket virker i 24 timer.</Notice>;
  return (
    <form action={action} style={form} noValidate>
      <Error state={state} />
      <Field label="Navn" name="displayName" icon="user" autoComplete="nickname" required maxLength={40} defaultValue={state?.values?.displayName} />
      <Field label="E-mail" name="email" type="email" icon="mail" autoComplete="email" required defaultValue={state?.values?.email} />
      <Field label="Adgangskode" name="password" type="password" icon="lock" autoComplete="new-password" required minLength={12} hint="Mindst 12 tegn. En sætning er både nem at huske og svær at gætte." />
      <Button type="submit" size="lg" full disabled={pending}>{pending ? 'Opretter…' : 'Opret konto'}</Button>
    </form>
  );
}

export function VerifyForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState(verifyEmailAction, undefined);
  return (
    <form action={action} style={form} noValidate>
      <Error state={state} />
      <input type="hidden" name="token" value={token} />
      <Field label="Adgangskode" name="password" type="password" icon="lock" autoComplete="current-password" required hint="Den adgangskode du valgte, da du oprettede kontoen." />
      <Button type="submit" size="lg" full disabled={pending}>{pending ? 'Bekræfter…' : 'Bekræft og log ind'}</Button>
    </form>
  );
}

export function ForgotForm() {
  const [state, action, pending] = useActionState(forgotPasswordAction, undefined);
  if (state?.done) return <Notice icon="mail" role="status">Hvis der findes en konto med den e-mail, har vi sendt et link til at nulstille adgangskoden. Linket virker i 30 minutter.</Notice>;
  return (
    <form action={action} style={form} noValidate>
      <Field label="E-mail" name="email" type="email" icon="mail" autoComplete="email" required />
      <Button type="submit" size="lg" full disabled={pending}>Send link</Button>
    </form>
  );
}

export function ResetForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState(resetPasswordAction, undefined);
  return (
    <form action={action} style={form} noValidate>
      <Error state={state} />
      <input type="hidden" name="token" value={token} />
      <Field label="Ny adgangskode" name="password" type="password" icon="lock" autoComplete="new-password" required minLength={12} hint="Mindst 12 tegn. Du bliver logget ud på alle enheder." />
      <Button type="submit" size="lg" full disabled={pending}>Gem ny adgangskode</Button>
    </form>
  );
}

export function ChangePasswordForm() {
  const [state, action, pending] = useActionState(changePasswordAction, undefined);
  return (
    <form action={action} style={form} noValidate>
      {state?.done && <Notice icon="check" role="status">Adgangskoden er ændret, og du er logget ud på alle andre enheder.</Notice>}
      <Error state={state} />
      <Field label="Nuværende adgangskode" name="currentPassword" type="password" autoComplete="current-password" required />
      <Field label="Ny adgangskode" name="newPassword" type="password" autoComplete="new-password" required minLength={12} />
      <Button type="submit" variant="outline" full disabled={pending}>Skift adgangskode</Button>
    </form>
  );
}
