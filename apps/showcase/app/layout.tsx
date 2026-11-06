import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import '@respin/ui/fonts.css'; // valgfri: Satoshi fra Fontshare
import './globals.css';          // Tailwind + @respin/ui (tokens, komponenter, tema)
import { Providers } from './providers';

export const metadata: Metadata = { title: 're:spin UI-kit', description: 'Showcase for @respin/ui' };
export const viewport: Viewport = { width: 'device-width', initialScale: 1, viewportFit: 'cover', themeColor: '#fdfbf7' };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="da">
      <body className="bg-canvas font-sans text-ink antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
