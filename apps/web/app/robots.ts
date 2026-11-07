import type { MetadataRoute } from 'next';
import { SITE_URL } from '../lib/site';

export const dynamic = 'force-static';

/** Alt offentligt må indekseres; konto, login-flow og API'et skal ikke i søgemaskinerne */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/api/', '/konto/', '/saelg/ny/', '/ny-adgangskode/', '/bekraeft-email/'] }],
    sitemap: `${SITE_URL}/sitemap.xml`
  };
}
