import type { Metadata, Viewport } from 'next';
import { headers } from 'next/headers';
import type { ReactNode } from 'react';
import '@respin/ui/reset.css';
import '@respin/ui/styles.css';

export const metadata: Metadata = { title: { default: 're:spin', template: '%s · re:spin' }, description: 'Giv tøjet nyt liv. Sælg nemt, køb unikt.' };
export const viewport: Viewport = { width: 'device-width', initialScale: 1, viewportFit: 'cover', themeColor: '#fdfbf7' };

export default async function RootLayout({ children }: { children: ReactNode }) {
  // Læsning af headers() gør siden dynamisk, så hver request får sin egen CSP-nonce (påkrævet af nonce-baseret CSP).
  // Next læser nonce fra CSP-headeren og sætter den automatisk på sine egne scripts.
  await headers();
  return (
    <html lang="da">
      <body>{children}</body>
    </html>
  );
}
