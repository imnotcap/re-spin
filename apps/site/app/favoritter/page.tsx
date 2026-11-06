import type { Metadata } from 'next';
import { Breadcrumbs } from '@respin/ui';
import { FavoritesList } from '../../components/search/FavoritesList';

export const metadata: Metadata = { title: 'Dine favoritter' };

export default function FavoritesPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 pt-5 sm:px-6">
      <Breadcrumbs items={[{ label: 'Forside', href: '/' }, { label: 'Favoritter' }]} />
      <h1 className="mt-4 text-h1 sm:text-[34px] sm:leading-[40px]">Dine favoritter</h1>
      {/* Statisk tekst: tegnes med det samme (hurtig LCP), mens listen hentes fra browseren */}
      <p className="mb-6 mt-1 max-w-2xl text-body text-muted sm:text-[17px] sm:leading-[26px]">
        Varer, du gemmer med hjertet, samles her. Favoritter gemmes kun i denne browser – du behøver ikke at logge ind.
      </p>
      {/* Fast mindstehøjde: listen hentes fra browseren efter indlæsning – footeren må ikke hoppe (CLS 0) */}
      <div className="min-h-[70vh]"><FavoritesList /></div>
    </div>
  );
}
