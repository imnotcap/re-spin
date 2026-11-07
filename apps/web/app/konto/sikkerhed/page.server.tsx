import { Badge, Button, Notice } from '@respin/ui';
import { AuthPage } from '../../../components/AuthPage';
import { AddPasskey, ReauthForm, TotpManage, TotpSetup } from '../../../components/Security';
import { getAuth, requireSession } from '../../../lib/auth';
import { passkeyRemoveAction } from '../../../lib/actions';

export const metadata = { title: 'Login og sikkerhed' };
const fmt = (d: Date | null) => (d ? d.toLocaleDateString('da-DK', { dateStyle: 'medium', timeZone: 'Europe/Copenhagen' }) : 'aldrig');
const crumbs = [{ label: 'Forside', href: '/' }, { label: 'Min konto', href: '/konto/' }, { label: 'Login og sikkerhed' }];
const h2 = 'text-[20px] font-bold leading-[26px]';

export default async function SecurityPage({ searchParams }: { searchParams: Promise<{ mfa?: string }> }) {
  const current = await requireSession('/konto/sikkerhed/');
  const auth = getAuth();
  const sp = await searchParams;
  if (!auth.isElevated(current)) {
    return <AuthPage width="page" title="Login og sikkerhed" crumbs={crumbs}><div className="max-w-md"><ReauthForm /></div></AuthPage>;
  }
  const [passkeys, mfa] = await Promise.all([auth.passkeys.list(current.user.id), auth.mfa.status(current.user.id)]);
  return (
    <AuthPage width="page" title="Login og sikkerhed" intro="Passkeys er den sikreste og nemmeste måde at logge ind på." crumbs={crumbs}>
      {sp.mfa === 'off' && <Notice icon="info" role="status">To-trins-login er slået fra.</Notice>}

      <section aria-labelledby="passkeys" className="border-t border-line pt-6">
        <h2 id="passkeys" className={h2}>Passkeys</h2>
        <p className="mt-1 text-small text-muted">Log ind med Face ID, fingeraftryk eller enhedens PIN. Kan ikke phishes, og der er ingen adgangskode at stjæle.</p>
        {passkeys.length > 0 && (
          <ul className="mt-4 divide-y divide-line rounded-lg border border-line">
            {passkeys.map((p) => (
              <li key={p.id} className="flex items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{p.name}</p>
                  <p className="text-small text-muted">Tilføjet {fmt(p.createdAt)} · sidst brugt {fmt(p.lastUsedAt)}{p.backedUp ? ' · synkroniseret' : ''}</p>
                </div>
                <form action={passkeyRemoveAction}>
                  <input type="hidden" name="credentialId" value={p.id} />
                  <Button type="submit" size="sm" variant="outline">Fjern</Button>
                </form>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-4 max-w-md"><AddPasskey /></div>
      </section>

      <section aria-labelledby="totp" className="border-t border-line pt-6">
        <div className="flex flex-wrap items-center gap-2">
          <h2 id="totp" className={h2}>To-trins-login</h2>
          {mfa.enabled ? <Badge tone="forest" icon="check">Slået til</Badge> : <Badge>Slået fra</Badge>}
        </div>
        <p className="mt-1 text-small text-muted">Ved login med adgangskode skal du også indtaste en kode fra en authenticator-app.{mfa.enabled ? ` Ubrugte gendannelseskoder: ${mfa.recoveryCodesLeft}.` : ''}</p>
        <div className="mt-4 max-w-md">{mfa.enabled ? <TotpManage /> : <TotpSetup />}</div>
      </section>
    </AuthPage>
  );
}
