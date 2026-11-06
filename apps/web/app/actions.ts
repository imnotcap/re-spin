'use server';

/**
 * Server Actions til login. De kan kaldes direkte med POST uden om UI'et, så HVER action validerer selv input,
 * session og ejerskab. Next tjekker Origin mod Host på Server Actions (CSRF); cookies er SameSite=Lax.
 */
import { redirect } from 'next/navigation';
import { safeRedirectPath } from '@respin/security';
import { clearSessionCookie, getAuth, getCurrentSession, requestContext, sessionToken, setSessionCookie } from '../lib/auth';
import { messageFor } from '../lib/messages';

/** `values` sendes tilbage, så formularen beholder indtastningen efter en fejl (React nulstiller ellers felterne). Aldrig adgangskoder. */
export type FormState = { error?: string; done?: boolean; values?: { email?: string; displayName?: string } } | undefined;
const str = (fd: FormData, key: string) => { const v = fd.get(key); return typeof v === 'string' ? v : ''; };

export async function signUpAction(_: FormState, fd: FormData): Promise<FormState> {
  const r = await getAuth().signUp({ email: str(fd, 'email'), password: str(fd, 'password'), displayName: str(fd, 'displayName') }, await requestContext());
  return r.ok ? { done: true } : { error: messageFor(r.error), values: { email: str(fd, 'email').slice(0, 254), displayName: str(fd, 'displayName').slice(0, 40) } };
}

export async function signInAction(_: FormState, fd: FormData): Promise<FormState> {
  const r = await getAuth().signIn({ email: str(fd, 'email'), password: str(fd, 'password') }, await requestContext());
  if (!r.ok) return { error: messageFor(r.error), values: { email: str(fd, 'email').slice(0, 254) } };
  await setSessionCookie(r.session);
  redirect(safeRedirectPath(str(fd, 'next'), '/account'));
}

export async function verifyEmailAction(_: FormState, fd: FormData): Promise<FormState> {
  const r = await getAuth().verifyEmail({ token: str(fd, 'token'), password: str(fd, 'password') }, await requestContext());
  if (!r.ok) return { error: messageFor(r.error) };
  await setSessionCookie(r.session);
  redirect('/account?welcome=1');
}

export async function forgotPasswordAction(_: FormState, fd: FormData): Promise<FormState> {
  await getAuth().requestPasswordReset({ email: str(fd, 'email') }, await requestContext());
  return { done: true }; // altid samme svar
}

export async function resetPasswordAction(_: FormState, fd: FormData): Promise<FormState> {
  const r = await getAuth().resetPassword({ token: str(fd, 'token'), password: str(fd, 'password') }, await requestContext());
  if (!r.ok) return { error: messageFor(r.error) };
  await clearSessionCookie();
  redirect('/login?reset=1');
}

export async function signOutAction(): Promise<void> {
  await getAuth().signOut(await sessionToken(), await requestContext());
  await clearSessionCookie();
  redirect('/');
}

export async function signOutOthersAction(): Promise<void> {
  const current = await getCurrentSession();
  if (!current) redirect('/login');
  await getAuth().signOutEverywhere(current.user.id, current.session.id, await requestContext());
  redirect('/account?others=1');
}

export async function revokeSessionAction(fd: FormData): Promise<void> {
  const current = await getCurrentSession();
  if (!current) redirect('/login');
  await getAuth().revokeSession(current.user.id, str(fd, 'sessionId')); // ejerskab tjekkes i revokeSession
  redirect('/account');
}

export async function changePasswordAction(_: FormState, fd: FormData): Promise<FormState> {
  const token = await sessionToken();
  if (!token) redirect('/login');
  const r = await getAuth().changePassword(token, { currentPassword: str(fd, 'currentPassword'), newPassword: str(fd, 'newPassword') }, await requestContext());
  if (!r.ok) {
    if (r.error === 'no_session') redirect('/login');
    return { error: messageFor(r.error) };
  }
  await setSessionCookie(r.session); // roteret session
  return { done: true };
}
