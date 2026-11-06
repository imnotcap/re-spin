import type { ReactNode } from 'react';
import { AppShell, Screen, ScreenContent, Text, TopBar } from '@respin/ui';

export function AuthPage({ title, intro, children, back = '/' }: { title: string; intro?: ReactNode; children: ReactNode; back?: string }) {
  return (
    <AppShell>
      <Screen>
        <TopBar backHref={back} />
        <ScreenContent>
          <div style={{ padding: '0 16px 32px', display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div>
              <Text variant="h1">{title}</Text>
              {intro && <Text muted style={{ marginTop: 8 }}>{intro}</Text>}
            </div>
            {children}
          </div>
        </ScreenContent>
      </Screen>
    </AppShell>
  );
}
