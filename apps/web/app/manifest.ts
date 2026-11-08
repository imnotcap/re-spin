import type { MetadataRoute } from 'next';
import { BASE_PATH, SITE } from '../lib/site';

export const dynamic = 'force-static';

/** Når siden gemmes på hjemmeskærmen (Android/Chrome): navn, farver og ikon */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SITE.name,
    short_name: SITE.name,
    description: SITE.description,
    start_url: `${BASE_PATH}/`,
    display: 'standalone',
    background_color: '#fdfbf7',
    theme_color: '#0e5a2f',
    lang: 'da',
    icons: [
      { src: `${BASE_PATH}/icon.svg`, sizes: 'any', type: 'image/svg+xml' },
      { src: `${BASE_PATH}/apple-icon.png`, sizes: '180x180', type: 'image/png' }
    ]
  };
}
