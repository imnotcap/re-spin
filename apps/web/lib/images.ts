/**
 * Stier til sidens egne fotos (public/img). Fotos er fra Unsplash (Unsplash-licensen), hentet,
 * beskåret og komprimeret til WebP. Base-stien sættes på, så de også virker på GitHub Pages (/re-spin).
 */
import { BASE_PATH } from './site';

const img = (p: string) => `${BASE_PATH}/img/${p}`;

/** Produktfoto (4:5) i to størrelser */
export const itemImage = (id: string) => ({
  src: img(`vare/${id}-480.webp`),
  srcSet: `${img(`vare/${id}-480.webp`)} 480w, ${img(`vare/${id}-960.webp`)} 960w`
});

/** Kvadratisk kategorifoto */
export const categoryImage = (slug: string) => img(`kategori/${slug}.webp`);

/** Bannerfoto i to bredder */
export const bannerImage = (name: 'hero' | 'saelg' | 'butik') => {
  const big = name === 'hero' ? 1600 : 1200;
  return { src: img(`banner/${name}-800.webp`), srcSet: `${img(`banner/${name}-800.webp`)} 800w, ${img(`banner/${name}-${big}.webp`)} ${big}w` };
};
