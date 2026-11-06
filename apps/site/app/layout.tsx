import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import localFont from 'next/font/local';
import './globals.css';
import { Providers } from './providers';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';
import { SITE } from '../lib/site';

// Inter (variabel, latin-delsæt inkl. æ/ø/å) – selv-hostet og forhåndsindlæst. next/font laver en
// størrelsestilpasset reserveskrift, så skiftet til Inter ikke flytter noget på siden (CLS 0).
const inter = localFont({
  src: './fonts/inter-latin-wght-normal.woff2',
  weight: '100 900',
  style: 'normal',
  display: 'swap',
  variable: '--font-inter'
});

export const metadata: Metadata = {
  title: { default: SITE.title, template: `%s · ${SITE.name}` },
  description: SITE.description,
  // Testversion: skal ikke findes i søgemaskiner
  robots: SITE.isTest ? { index: false, follow: false } : undefined,
  openGraph: { title: SITE.title, description: SITE.description, locale: 'da_DK', type: 'website', siteName: SITE.name },
  formatDetection: { telephone: false }
};

export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#fdfbf7' };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="da" className={inter.variable}>
      <body className="min-h-dvh">
        <a href="#indhold" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-lime focus:px-4 focus:py-2 focus:font-bold">
          Spring til indhold
        </a>
        <Providers>
          <Header />
          <main id="indhold">{children}</main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
