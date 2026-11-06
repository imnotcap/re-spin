import { AppShell, Button, Hero, Screen, ScreenContent, Text, Wordmark } from '@respin/ui';
import { getCurrentSession } from '../lib/auth';

export default async function Home() {
  const current = await getCurrentSession().catch(() => null); // forsiden må virke, selv hvis databasen er nede
  return (
    <AppShell>
      <Screen>
        <ScreenContent>
          <div style={{ padding: '24px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Wordmark size={32} color="var(--rs-forest)" onLight />
            {current ? <Button size="sm" variant="outline" href="/account">Min konto</Button> : <Button size="sm" variant="outline" href="/login">Log ind</Button>}
          </div>
          <Hero title="Giv tøjet nyt liv. Sælg nemt, køb unikt.">
            <Button variant="dark" size="sm" href={current ? '/sell' : '/signup'}>{current ? 'Sælg nu' : 'Opret konto'}</Button>
          </Hero>
          <div style={{ padding: 16 }}>
            <Text variant="small" muted>{current ? `Hej ${current.user.displayName}!` : 'Skelet: feed, søgning og annoncer kommer i fase 1.'}</Text>
          </div>
        </ScreenContent>
      </Screen>
    </AppShell>
  );
}
