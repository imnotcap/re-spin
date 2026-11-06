import { AppShell, Button, Hero, Screen, ScreenContent, Text, Wordmark } from '@respin/ui';

export default function Home() {
  return (
    <AppShell>
      <Screen>
        <ScreenContent>
          <div style={{ padding: '24px 16px' }}><Wordmark size={32} color="var(--rs-forest)" onLight /></div>
          <Hero title="Giv tøjet nyt liv. Sælg nemt, køb unikt.">
            <Button variant="dark" size="sm" href="/sell">Sælg nu</Button>
          </Hero>
          <div style={{ padding: 16 }}>
            <Text variant="small" muted>Skelet: her kommer feed, søgning og annoncer (se docs/platform/04-roadmap.md).</Text>
          </div>
        </ScreenContent>
      </Screen>
    </AppShell>
  );
}
