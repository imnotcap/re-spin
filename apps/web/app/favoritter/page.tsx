import type { Metadata } from 'next';
import { pageMetadata } from '../../lib/seo';
import { Breadcrumbs } from '@respin/ui';
import { T } from '../../lib/i18n/client';
import { FavoritesList } from '../../components/search/FavoritesList';

export const metadata: Metadata = pageMetadata({ title: 'Dine favoritter', description: 'De varer, du har gemt på Videro.', path: '/favoritter/', noindex: true });

export default function FavoritesPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 pt-5 sm:px-6">
      <Breadcrumbs items={[{ label: <T k="crumb.home" />, href: '/' }, { label: <T k="crumb.favorites" /> }]} />
      <h1 className="mt-4 text-h1 sm:text-[34px] sm:leading-[40px]"><T k="footer.favorites" /></h1>
      {/* Statisk tekst: tegnes med det samme (hurtig LCP), mens listen hentes fra browseren */}
      <p className="mb-6 mt-1 max-w-2xl text-body text-muted sm:text-[17px] sm:leading-[26px]">
        <T k="fav.intro" />
      </p>
      {/* Fast mindstehøjde: listen hentes fra browseren efter indlæsning – footeren må ikke hoppe (CLS 0) */}
      <div className="min-h-[70vh]"><FavoritesList /></div>
    </div>
  );
}
