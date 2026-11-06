'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { RespinProvider, ToastProvider } from '@respin/ui';

/** Én gang i roden: kit-links bruger next/link, og toasts er tilgængelige overalt. */
export function Providers({ children }: { children: ReactNode }) {
  return (
    <RespinProvider linkComponent={Link}>
      <ToastProvider>{children}</ToastProvider>
    </RespinProvider>
  );
}
