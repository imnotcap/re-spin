/**
 * Stier til sidens egne fotos (public/img). Fotos er fra Unsplash (Unsplash-licensen), hentet,
 * beskåret og komprimeret til WebP. Base-stien sættes på, så de også virker på GitHub Pages (/re-spin).
 */
import type { BadgeId } from '@respin/core/badges';
import { BASE_PATH } from './site';

const img = (p: string) => `${BASE_PATH}/img/${p}`;

const set = (paths: Array<[string, number]>) => paths.map(([p, w]) => `${img(p)} ${w}w`).join(', ');

/** Kvadratisk kategorifoto (160/240/480) – fliserne er ca. 140 px brede */
export const categoryImage = (slug: string) => ({
  src: img(`kategori/${slug}-240.webp`),
  srcSet: set([[`kategori/${slug}-160.webp`, 160], [`kategori/${slug}-240.webp`, 240], [`kategori/${slug}.webp`, 480]])
});

/** Kategoriens tegning (SVG) til forsidens kategorier */
export const categoryIllustration = (slug: string) => img(`kategori/illustreret/${slug}.svg`);

/** Badgens tegning (SVG) – farvet når den er optjent, grå med lås når den er låst */
const BADGE_FILE: Record<BadgeId, string> = {
  first_listing: 'foerste-annonce', seller_10: 'flittig-saelger', first_sale: 'foerste-salg', sales_10: '10-salg',
  sales_50: 'genbrugshelt', certified: 'certificeret', secure: 'sikker-konto', profile: 'klar-profil',
  popular: 'populaer', variety: 'alsidig', pioneer: 'pioner'
};
export const badgeImage = (id: BadgeId, earned: boolean) =>
  img(earned ? `badges/svg/${BADGE_FILE[id]}.svg` : `badges/svg-locked/${BADGE_FILE[id]}-locked.svg`);

/** Bannerfoto i flere bredder (mobil 480–800, desktop op til 1600) */
export const bannerImage = (name: 'hero' | 'saelg' | 'butik') => {
  const big = name === 'hero' ? 1600 : 1200;
  return {
    src: img(`banner/${name}-800.webp`),
    srcSet: set([[`banner/${name}-480.webp`, 480], [`banner/${name}-640.webp`, 640], [`banner/${name}-800.webp`, 800], [`banner/${name}-${big}.webp`, big]])
  };
};
