import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { headers } from 'next/headers';
import localFont from 'next/font/local';
import './globals.css';
import { Providers } from './providers';
import { CategoryNav, Header } from '../components/Header';
import { TopBar } from '../components/TopBar';
import { Footer } from '../components/Footer';
import { CookieBanner } from '../components/consent/CookieBanner';
import { menuMeta } from '../lib/catalog';
import { SITE_URL, SITE } from '../lib/site';

// Inter (variabel, latin-delsæt inkl. æ/ø/å) – selv-hostet. next/font laver en størrelsestilpasset
// reserveskrift, så skiftet til Inter ikke flytter noget på siden (CLS 0). Delsæt (latin + æøå, vægt 400–800):
// 27 KB i stedet for 48 KB – lavet med fonttools (pyftsubset + varLib.instancer), se app/fonts/OFL-Inter.txt.
const inter = localFont({
  src: './fonts/inter-latin-wght-normal.woff2',
  weight: '400 800',
  style: 'normal',
  display: 'swap',
  variable: '--font-inter'
});

export const metadata: Metadata = {
  title: { default: SITE.title, template: `%s · ${SITE.name}` },
  description: SITE.description,
  metadataBase: new URL(`${SITE_URL}/`),
  alternates: { canonical: './' },
  openGraph: { title: SITE.title, description: SITE.description, locale: 'da_DK', type: 'website', siteName: SITE.name },
  formatDetection: { telephone: false }
};

export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#ffffff' };

const isServer = process.env.NEXT_PUBLIC_AUTH_ENABLED === '1';

export default async function RootLayout({ children }: { children: ReactNode }) {
  // Server-tilstand: headers() gør hver side dynamisk, så den får sin egen CSP-nonce (sat af proxy.server.ts).
  // Next læser nonce fra CSP-headeren og sætter den på sine egne scripts. Statisk eksport kalder den ikke.
  if (isServer) await headers();
  const meta = menuMeta();
  return (
    <html lang="da" className={inter.variable} data-scroll-behavior="smooth">
      <body className="rs-flat flex min-h-dvh flex-col">
        <a href="#indhold" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-lime focus:px-4 focus:py-2 focus:font-bold">
          Spring til indhold
        </a>
        <Providers>
          <TopBar />
          <Header meta={meta} />
          <CategoryNav meta={meta} />
          <main id="indhold" className="flex-1">{children}</main>
          <Footer />
          <CookieBanner />
        </Providers>
      </body>
    </html>
  );
}
