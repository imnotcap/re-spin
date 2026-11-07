'use server';

/**
 * Server Actions til login. De kan kaldes direkte med POST uden om UI'et, så HVER action validerer selv input,
 * session og ejerskab. Next tjekker Origin mod Host på Server Actions (CSRF); cookies er SameSite=Lax.
 */
import { redirect } from 'next/navigation';
import { safeRedirectPath } from '@respin/security';
import { clearSessionCookie, getAuth, getCurrentSession, requestContext, sessionToken, setSessionCookie } from './auth';
import { messageFor } from './messages';

/** `values` sendes tilbage, så formularen beholder indtastningen efter en fejl (React nulstiller ellers felterne). Aldrig adgangskoder. */
export type FormState = { error?: string; done?: boolean; values?: { email?: string; displayName?: string }; mfaToken?: string; next?: string } | undefined;
const str = (fd: FormData, key: string) => { const v = fd.get(key); return typeof v === 'string' ? v : ''; };

export async function signUpAction(_: FormState, fd: FormData): Promise<FormState> {
  const r = await getAuth().signUp({ email: str(fd, 'email'), password: str(fd, 'password'), displayName: str(fd, 'displayName') }, await requestContext());
  return r.ok ? { done: true } : { error: messageFor(r.error), values: { email: str(fd, 'email').slice(0, 254), displayName: str(fd, 'displayName').slice(0, 40) } };
}

export async function signInAction(_: FormState, fd: FormData): Promise<FormState> {
  const r = await getAuth().signIn({ email: str(fd, 'email'), password: str(fd, 'password') }, await requestContext());
  if (!r.ok && r.error === 'mfa_required') return { mfaToken: r.mfaToken, next: str(fd, 'next') };
  if (!r.ok) return { error: messageFor(r.error), values: { email: str(fd, 'email').slice(0, 254) } };
  await setSessionCookie(r.session);
  redirect(safeRedirectPath(str(fd, 'next'), '/konto/'));
}

export async function verifyEmailAction(_: FormState, fd: FormData): Promise<FormState> {
  const r = await getAuth().verifyEmail({ token: str(fd, 'token'), password: str(fd, 'password') }, await requestContext());
  if (!r.ok) return { error: messageFor(r.error) };
  await setSessionCookie(r.session);
  redirect('/konto/?welcome=1');
}

export async function forgotPasswordAction(_: FormState, fd: FormData): Promise<FormState> {
  await getAuth().requestPasswordReset({ email: str(fd, 'email') }, await requestContext());
  return { done: true }; // altid samme svar
}

export async function resetPasswordAction(_: FormState, fd: FormData): Promise<FormState> {
  const r = await getAuth().resetPassword({ token: str(fd, 'token'), password: str(fd, 'password') }, await requestContext());
  if (!r.ok) return { error: messageFor(r.error) };
  await clearSessionCookie();
  redirect('/log-ind/?reset=1');
}

export async function signOutAction(): Promise<void> {
  await getAuth().signOut(await sessionToken(), await requestContext());
  await clearSessionCookie();
  redirect('/');
}

export async function signOutOthersAction(): Promise<void> {
  const current = await getCurrentSession();
  if (!current) redirect('/log-ind/');
  await getAuth().signOutEverywhere(current.user.id, current.session.id, await requestContext());
  redirect('/konto/?others=1');
}

export async function revokeSessionAction(fd: FormData): Promise<void> {
  const current = await getCurrentSession();
  if (!current) redirect('/log-ind/');
  await getAuth().revokeSession(current.user.id, str(fd, 'sessionId')); // ejerskab tjekkes i revokeSession
  redirect('/konto/');
}

export async function changePasswordAction(_: FormState, fd: FormData): Promise<FormState> {
  const token = await sessionToken();
  if (!token) redirect('/log-ind/');
  const r = await getAuth().changePassword(token, { currentPassword: str(fd, 'currentPassword'), newPassword: str(fd, 'newPassword') }, await requestContext());
  if (!r.ok) {
    if (r.error === 'no_session') redirect('/log-ind/');
    return { error: messageFor(r.error) };
  }
  await setSessionCookie(r.session); // roteret session
  return { done: true };
}

/* ------------------------------ To-trins-login ------------------------------ */
export async function verifyMfaAction(_: FormState, fd: FormData): Promise<FormState> {
  const mfaToken = str(fd, 'mfaToken');
  const r = await getAuth().mfa.verifyLogin({ mfaToken, code: str(fd, 'code') }, await requestContext());
  if (!r.ok) return r.error === 'invalid_code' ? { error: messageFor(r.error), mfaToken, next: str(fd, 'next') } : { error: messageFor(r.error) };
  await setSessionCookie(r.session);
  redirect(safeRedirectPath(str(fd, 'next'), '/konto/'));
}

/* --------------------------- Genbekræftelse (step-up) --------------------------- */
export async function reauthAction(_: FormState, fd: FormData): Promise<FormState> {
  const token = await sessionToken();
  if (!token) redirect('/log-ind/');
  const r = await getAuth().reauthenticate(token, str(fd, 'password'), await requestContext());
  if (!r.ok) { if (r.error === 'no_session') redirect('/log-ind/'); return { error: messageFor(r.error) }; }
  redirect('/konto/sikkerhed/');
}

async function currentOrLogin() {
  const cur = await getCurrentSession();
  if (!cur) redirect('/log-ind/?next=%2Fkonto%2Fsikkerhed%2F');
  return cur;
}

/* ---------------------------------- TOTP ---------------------------------- */
export type TotpSetupState = { error?: string; qr?: string; secret?: string; recoveryCodes?: string[] } | undefined;

export async function beginTotpAction(): Promise<TotpSetupState> {
  const cur = await currentOrLogin();
  const r = await getAuth().mfa.beginTotpSetup(cur);
  if (!r.ok) return { error: messageFor(r.error) };
  const QRCode = (await import('qrcode')).default;
  return { qr: await QRCode.toDataURL(r.uri, { margin: 1, width: 220 }), secret: r.secret.replace(/(.{4})/g, '$1 ').trim() };
}

export async function confirmTotpAction(prev: TotpSetupState, fd: FormData): Promise<TotpSetupState> {
  const cur = await currentOrLogin();
  const r = await getAuth().mfa.confirmTotpSetup(cur, str(fd, 'code'), await requestContext());
  if (!r.ok) return { ...prev, error: messageFor(r.error) };
  return { recoveryCodes: r.recoveryCodes };
}

export async function disableTotpAction(_: FormState, fd: FormData): Promise<FormState> {
  const cur = await currentOrLogin();
  const r = await getAuth().mfa.disableTotp(cur, str(fd, 'code'), await requestContext());
  if (!r.ok) return { error: messageFor(r.error) };
  redirect('/konto/sikkerhed/?mfa=off');
}

export async function regenerateCodesAction(): Promise<TotpSetupState> {
  const cur = await currentOrLogin();
  const r = await getAuth().mfa.regenerateRecoveryCodes(cur, await requestContext());
  return r.ok ? { recoveryCodes: r.recoveryCodes } : { error: messageFor(r.error) };
}

/* -------------------------------- Passkeys -------------------------------- */
export async function passkeyRegisterOptionsAction() {
  const cur = await currentOrLogin();
  const r = await getAuth().passkeys.registrationOptions(cur);
  return r.ok ? { options: r.options } : { error: messageFor(r.error) };
}

export async function passkeyRegisterVerifyAction(response: unknown, name: string): Promise<{ error?: string }> {
  const cur = await currentOrLogin();
  const r = await getAuth().passkeys.verifyRegistration(cur, response as never, typeof name === 'string' ? name : '', await requestContext());
  return r.ok ? {} : { error: messageFor(r.error) };
}

export async function passkeyRemoveAction(fd: FormData): Promise<void> {
  const cur = await currentOrLogin();
  await getAuth().passkeys.remove(cur, str(fd, 'credentialId'), await requestContext());
  redirect('/konto/sikkerhed/');
}

export async function passkeyLoginOptionsAction() {
  const r = await getAuth().passkeys.loginOptions(await requestContext());
  return r.ok ? { options: r.options } : { error: messageFor(r.error) };
}

export async function passkeyLoginVerifyAction(response: unknown, next: string): Promise<{ error?: string; redirectTo?: string }> {
  const r = await getAuth().passkeys.verifyLogin(response as never, await requestContext());
  if (!r.ok) return { error: messageFor(r.error) };
  await setSessionCookie(r.session);
  return { redirectTo: safeRedirectPath(next, '/konto/') };
}
