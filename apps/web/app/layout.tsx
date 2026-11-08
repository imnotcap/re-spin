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
import { BottomNav } from '../components/nav/BottomNav';
import { getMenuMeta } from '../lib/site-stats';
import { Tracker } from '../components/Tracker';
import { SITE_URL, SITE } from '../lib/site';
import { DEFAULT_OG_IMAGE } from '../lib/seo';

// Schibsted Grotesk (variabel, latin-delsæt inkl. æ/ø/å, vægt 400–800) – selv-hostet. next/font laver en
// størrelsestilpasset reserveskrift, så skiftet til skriften ikke flytter noget på siden (CLS 0). Delsættet er 36 KB
// (original 47 KB), lavet med fonttools (varLib.instancer + subset). Funktionen tnum (tabelfigurer) er rettet, så den
// kun gælder cifre: i originalen gør den også punktum, komma og kolon brede ("450 kr ."). Licens: app/fonts/OFL-Schibsted-Grotesk.txt.
const brandFont = localFont({
  src: './fonts/schibsted-grotesk-latin-wght.woff2',
  weight: '400 800',
  style: 'normal',
  display: 'swap',
  variable: '--font-brand'
});

export const metadata: Metadata = {
  title: { default: SITE.title, template: `%s · ${SITE.name}` },
  description: SITE.description,
  applicationName: SITE.name,
  metadataBase: new URL(`${SITE_URL}/`),
  alternates: { canonical: './' },
  openGraph: { title: SITE.title, description: SITE.description, locale: 'da_DK', type: 'website', siteName: SITE.name, url: './', images: [DEFAULT_OG_IMAGE] },
  twitter: { card: 'summary_large_image', title: SITE.title, description: SITE.description, images: [DEFAULT_OG_IMAGE.url] },
  appleWebApp: { title: SITE.name, statusBarStyle: 'default' },
  formatDetection: { telephone: false }
};

export const viewport: Viewport = { width: 'device-width', initialScale: 1, viewportFit: 'cover', themeColor: '#ffffff' };

const isServer = process.env.NEXT_PUBLIC_AUTH_ENABLED === '1';

export default async function RootLayout({ children }: { children: ReactNode }) {
  // Server-tilstand: headers() gør hver side dynamisk, så den får sin egen CSP-nonce (sat af proxy.server.ts).
  // Next læser nonce fra CSP-headeren og sætter den på sine egne scripts. Statisk eksport kalder den ikke.
  if (isServer) await headers();
  const meta = await getMenuMeta();
  return (
    <html lang="da" className={brandFont.variable} data-scroll-behavior="smooth">
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
          <BottomNav />
          <Tracker />
          <CookieBanner />
        </Providers>
      </body>
    </html>
  );
}
