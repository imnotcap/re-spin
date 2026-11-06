import { Badge, Button, List, ListRow, Notice, Text } from '@respin/ui';
import { AuthPage } from '../../../components/AuthPage';
import { AddPasskey, ReauthForm, TotpManage, TotpSetup } from '../../../components/Security';
import { getAuth, requireSession } from '../../../lib/auth';
import { passkeyRemoveAction } from '../../actions';

export const metadata = { title: 'Login og sikkerhed' };
const fmt = (d: Date | null) => (d ? d.toLocaleDateString('da-DK', { dateStyle: 'medium', timeZone: 'Europe/Copenhagen' }) : 'aldrig');

export default async function SecurityPage({ searchParams }: { searchParams: Promise<{ mfa?: string }> }) {
  const current = await requireSession('/account/security');
  const auth = getAuth();
  const sp = await searchParams;
  if (!auth.isElevated(current)) {
    return <AuthPage title="Login og sikkerhed" back="/account"><ReauthForm /></AuthPage>;
  }
  const [passkeys, mfa] = await Promise.all([auth.passkeys.list(current.user.id), auth.mfa.status(current.user.id)]);
  return (
    <AuthPage title="Login og sikkerhed" intro="Passkeys er den sikreste og nemmeste måde at logge ind på." back="/account">
      {sp.mfa === 'off' && <Notice icon="info" role="status">To-trins-login er slået fra.</Notice>}
      <section style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Text variant="h3">Passkeys</Text>
        <Text variant="small" muted>Log ind med Face ID, fingeraftryk eller enhedens PIN. Kan ikke phishes, og der er ingen adgangskode at stjæle.</Text>
        {passkeys.length > 0 && (
          <List style={{ margin: 0 }}>
            {passkeys.map((p) => (
              <form key={p.id} action={passkeyRemoveAction}>
                <input type="hidden" name="credentialId" value={p.id} />
                <ListRow icon="lock" title={p.name} description={`Tilføjet ${fmt(p.createdAt)} · sidst brugt ${fmt(p.lastUsedAt)}${p.backedUp ? ' · synkroniseret' : ''}`}
                  trailing={<Button type="submit" size="sm" variant="ghost">Fjern</Button>} chevron={false} />
              </form>
            ))}
          </List>
        )}
        <AddPasskey />
      </section>
      <section style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div className="rs-row-flex rs-gap-2"><Text variant="h3">To-trins-login</Text>{mfa.enabled ? <Badge tone="forest" icon="check">Slået til</Badge> : <Badge>Slået fra</Badge>}</div>
        <Text variant="small" muted>Ved login med adgangskode skal du også indtaste en kode fra en authenticator-app.{mfa.enabled ? ` Ubrugte gendannelseskoder: ${mfa.recoveryCodesLeft}.` : ''}</Text>
        {mfa.enabled ? <TotpManage /> : <TotpSetup />}
      </section>
      <Button href="/account" variant="ghost">Tilbage til min konto</Button>
    </AuthPage>
  );
}
