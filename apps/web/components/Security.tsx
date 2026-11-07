'use client';

import { useActionState, useState } from 'react';
import { useRouter } from 'next/navigation';
import { browserSupportsWebAuthn, startAuthentication, startRegistration } from '@simplewebauthn/browser';
import { Button, Field, Notice } from '@respin/ui';
import {
  beginTotpAction, confirmTotpAction, disableTotpAction, passkeyLoginOptionsAction, passkeyLoginVerifyAction, passkeyRegisterOptionsAction,
  passkeyRegisterVerifyAction, reauthAction, regenerateCodesAction, type FormState, type TotpSetupState
} from '../lib/actions';

const Err = ({ msg }: { msg?: string }) => (msg ? <Notice icon="info" warn role="alert" data-testid="form-error">{msg}</Notice> : null);

export function PasskeyLoginButton({ next }: { next: string }) {
  const router = useRouter();
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  async function go() {
    setError(undefined); setBusy(true);
    try {
      if (!browserSupportsWebAuthn()) { setError('Din browser understøtter ikke passkeys.'); return; }
      const o = await passkeyLoginOptionsAction();
      if (!o.options) { setError(o.error); return; }
      const r = await passkeyLoginVerifyAction(await startAuthentication({ optionsJSON: o.options }), next);
      if (r.redirectTo) router.push(r.redirectTo); else setError(r.error);
    } catch { setError('Login med passkey blev afbrudt.'); } finally { setBusy(false); }
  }
  return <div className="flex flex-col gap-3"><Err msg={error} /><Button type="button" variant="dark" size="lg" full icon="lock" onClick={go} disabled={busy}>Log ind med passkey</Button></div>;
}

export function ReauthForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(reauthAction, undefined);
  return (
    <form action={action} className="flex flex-col gap-3" noValidate>
      <Notice icon="shield">Af sikkerhedshensyn skal du bekræfte din adgangskode, før du ændrer login-indstillinger. Det gælder i 10 minutter.</Notice>
      <Err msg={state?.error} />
      <Field label="Adgangskode" name="password" type="password" autoComplete="current-password" required />
      <Button type="submit" disabled={pending}>Bekræft</Button>
    </form>
  );
}

export function AddPasskey() {
  const router = useRouter();
  const [error, setError] = useState<string>();
  const [name, setName] = useState('');
  async function add() {
    setError(undefined);
    try {
      const o = await passkeyRegisterOptionsAction();
      if (!o.options) { setError(o.error); return; }
      const r = await passkeyRegisterVerifyAction(await startRegistration({ optionsJSON: o.options }), name);
      if (r.error) setError(r.error); else { setName(''); router.refresh(); }
    } catch { setError('Oprettelse af passkey blev afbrudt.'); }
  }
  return (
    <div className="flex flex-col gap-3">
      <Err msg={error} />
      <Field label="Navn på enheden" name="passkeyName" value={name} onChange={(e) => setName(e.target.value)} placeholder="fx iPhone eller arbejdscomputer" maxLength={40} optional />
      <Button type="button" variant="outline" icon="plus" onClick={add}>Tilføj passkey</Button>
    </div>
  );
}

function RecoveryCodes({ codes }: { codes: string[] }) {
  return (
    <div className="flex flex-col gap-3" data-testid="recovery-codes">
      <Notice icon="info" warn><b>Gem disse gendannelseskoder et sikkert sted nu.</b> De vises kun denne ene gang. Hver kode kan bruges én gang, hvis du mister din telefon.</Notice>
      <pre className="m-0 columns-2 rounded-md border border-line bg-stone-50 p-3 font-mono text-[15px] leading-6">{codes.join('\n')}</pre>
    </div>
  );
}

export function TotpSetup() {
  const [setup, begin, beginning] = useActionState<TotpSetupState>(beginTotpAction, undefined);
  const [state, confirm, confirming] = useActionState<TotpSetupState, FormData>(confirmTotpAction, undefined);
  if (state?.recoveryCodes) return <><Notice icon="check" role="status">To-trins-login er slået til.</Notice><RecoveryCodes codes={state.recoveryCodes} /></>;
  if (!setup?.qr) return <form action={begin} className="flex flex-col gap-3"><Err msg={setup?.error} /><Button type="submit" variant="outline" disabled={beginning}>Slå to-trins-login til</Button></form>;
  return (
    <form action={confirm} className="flex flex-col gap-3" noValidate>
      <p className="text-small text-slate-700">Scan QR-koden med din authenticator-app (fx Google Authenticator, Microsoft Authenticator eller 1Password), og skriv koden, appen viser.</p>
      <img src={setup.qr} alt="QR-kode til authenticator-app" width={220} height={220} className="self-center rounded-md border border-line" />
      <p className="text-caption text-muted">Kan du ikke scanne? Indtast nøglen manuelt: <code data-testid="totp-secret">{setup.secret}</code></p>
      <Err msg={state?.error} />
      <Field label="Kode fra appen" name="code" inputMode="numeric" autoComplete="one-time-code" required maxLength={6} />
      <Button type="submit" disabled={confirming}>Bekræft og slå til</Button>
    </form>
  );
}

export function TotpManage() {
  const [state, disable, disabling] = useActionState<FormState, FormData>(disableTotpAction, undefined);
  const [codes, regenerate] = useActionState<TotpSetupState>(regenerateCodesAction, undefined);
  return (
    <div className="flex flex-col gap-3">
      {codes?.recoveryCodes ? <RecoveryCodes codes={codes.recoveryCodes} /> : <form action={regenerate}><Button type="submit" variant="ghost" size="sm">Lav nye gendannelseskoder</Button></form>}
      <form action={disable} className="flex flex-col gap-3" noValidate>
        <Err msg={state?.error} />
        <Field label="Kode (for at slå fra)" name="code" autoComplete="one-time-code" required maxLength={24} />
        <Button type="submit" variant="outline" disabled={disabling}>Slå to-trins-login fra</Button>
      </form>
    </div>
  );
}
