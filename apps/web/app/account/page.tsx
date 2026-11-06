import { Button, List, ListRow, Notice, Text } from '@respin/ui';
import { AuthPage } from '../../components/AuthPage';
import { ChangePasswordForm } from '../../components/AuthForms';
import { getAuth, requireSession } from '../../lib/auth';
import { revokeSessionAction, signOutAction, signOutOthersAction } from '../actions';

export const metadata = { title: 'Min konto' };

const fmt = (d: Date) => d.toLocaleString('da-DK', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Europe/Copenhagen' });
const device = (ua: string | null) => (ua ? (/(iPhone|iPad|Android|Macintosh|Windows|Linux)/.exec(ua)?.[1] ?? 'Ukendt enhed') : 'Ukendt enhed');

export default async function AccountPage({ searchParams }: { searchParams: Promise<{ welcome?: string; others?: string }> }) {
  const current = await requireSession('/account');
  const sp = await searchParams;
  const list = await getAuth().listSessions(current.user.id);
  return (
    <AuthPage title="Min konto" intro={`Logget ind som ${current.user.displayName} (${current.user.email})`}>
      {sp.welcome && <Notice icon="check" role="status">Din e-mail er bekræftet. Velkommen til re:spin!</Notice>}
      {sp.others && <Notice icon="check" role="status">Du er logget ud på alle andre enheder.</Notice>}

      <section>
        <Text variant="h3" style={{ marginBottom: 8 }}>Aktive enheder</Text>
        <List style={{ margin: 0 }}>
          {list.map((s) => (
            <form key={s.id} action={revokeSessionAction}>
              <input type="hidden" name="sessionId" value={s.id} />
              <ListRow icon="phone" title={`${device(s.userAgent)}${s.id === current.session.id ? ' · denne enhed' : ''}`} description={`Sidst aktiv ${fmt(s.lastSeenAt)}`}
                trailing={s.id === current.session.id ? undefined : <Button type="submit" size="sm" variant="ghost">Log ud</Button>} chevron={false} />
            </form>
          ))}
        </List>
        {list.length > 1 && <form action={signOutOthersAction} style={{ marginTop: 12 }}><Button type="submit" variant="outline" full>Log ud på alle andre enheder</Button></form>}
      </section>

      <Button href="/account/security" variant="outline" full icon="shield">Login og sikkerhed (passkeys, to-trins-login)</Button>

      <section>
        <Text variant="h3" style={{ marginBottom: 8 }}>Adgangskode</Text>
        <ChangePasswordForm />
      </section>

      <form action={signOutAction}><Button type="submit" variant="dark" full icon="logout">Log ud</Button></form>
    </AuthPage>
  );
}
