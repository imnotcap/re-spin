/**
 * Stier til sidens egne fotos (public/img). Fotos er fra Unsplash (Unsplash-licensen), hentet,
 * beskåret og komprimeret til WebP. Base-stien sættes på, så de også virker på GitHub Pages (/re-spin).
 */
import { BASE_PATH } from './site';

const img = (p: string) => `${BASE_PATH}/img/${p}`;

const set = (paths: Array<[string, number]>) => paths.map(([p, w]) => `${img(p)} ${w}w`).join(', ');

/** Kvadratisk kategorifoto (160/240/480) – fliserne er ca. 140 px brede */
export const categoryImage = (slug: string) => ({
  src: img(`kategori/${slug}-240.webp`),
  srcSet: set([[`kategori/${slug}-160.webp`, 160], [`kategori/${slug}-240.webp`, 240], [`kategori/${slug}.webp`, 480]])
});

/** Bannerfoto i flere bredder (mobil 480–800, desktop op til 1600) */
export const bannerImage = (name: 'hero' | 'saelg' | 'butik') => {
  const big = name === 'hero' ? 1600 : 1200;
  return {
    src: img(`banner/${name}-800.webp`),
    srcSet: set([[`banner/${name}-480.webp`, 480], [`banner/${name}-640.webp`, 640], [`banner/${name}-800.webp`, 800], [`banner/${name}-${big}.webp`, big]])
  };
};
