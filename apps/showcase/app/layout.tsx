import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
// 1) tokens + komponenter  2) valgfri reset  3) valgfri Satoshi-font
import '@respin/ui/fonts.css';
import '@respin/ui/reset.css';
import '@respin/ui/styles.css';
import { Providers } from './providers';

export const metadata: Metadata = { title: 're:spin UI-kit', description: 'Showcase for @respin/ui' };
export const viewport: Viewport = { width: 'device-width', initialScale: 1, viewportFit: 'cover', themeColor: '#fdfbf7' };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="da">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
