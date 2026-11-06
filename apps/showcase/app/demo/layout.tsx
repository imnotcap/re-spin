import type { ReactNode } from 'react';
import { AppShell } from '@respin/ui';

export default function DemoLayout({ children }: { children: ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
