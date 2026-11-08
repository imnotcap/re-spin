/** Fælles indhold og konfiguration for hjemmesiden */
export const SITE = {
  name: 'Videro',
  title: 'Videro – køb og sælg brugt tøj, sko og boligting',
  description: 'Dansk markedsplads for brugt tøj, sko og boligting. Gratis at oprette annoncer, og køberbeskyttelse på alle køb.',
  /** Testversion: banneret siger, at intet er til salg endnu (siden må gerne findes i søgemaskiner) */
  isTest: true
} as const;

/** Sidens offentlige adresse uden afsluttende skråstreg, fx "https://imnotcap.github.io/re-spin" – til sitemap, robots og kanoniske links */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/+$/, '');

/** Basis-sti på GitHub Pages ("/re-spin"); tom lokalt og ved eget domæne */
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? '';

/** Hjælp og information – i topbjælken, mobilmenuen og footeren */
export const HELP_NAV = [
  { href: '/saadan-virker-det/', label: 'Sådan virker det', key: 'nav.how' },
  { href: '/sikkerhed/', label: 'Køberbeskyttelse', key: 'nav.protection' },
  { href: '/saadan-virker-det/#faq', label: 'Spørgsmål og svar', key: 'nav.faq' }
] as const;

/**
 * Sociale medier i footeren. OBS: profilnavnene er pladsholdere – ret dem til jeres rigtige profiler, før
 * siden lanceres (linkene peger ellers på profiler, I ikke ejer).
 */
export const SOCIAL = [
  { name: 'Instagram', icon: 'instagram', href: 'https://www.instagram.com/videro.dk/' },
  { name: 'TikTok', icon: 'tiktok', href: 'https://www.tiktok.com/@videro.dk' },
  { name: 'Facebook', icon: 'facebook', href: 'https://www.facebook.com/videro.dk' },
  { name: 'LinkedIn', icon: 'linkedin', href: 'https://www.linkedin.com/company/videro-dk/' },
  { name: 'YouTube', icon: 'youtube', href: 'https://www.youtube.com/@videro.dk' }
] as const;

/** Juridiske sider og info – footerens nederste linje */
export const LEGAL_NAV = [
  { href: '/privatliv/', key: 'footer.privacy' },
  { href: '/cookiepolitik/', key: 'footer.cookies' },
  { href: '/cookieindstillinger/', key: 'footer.cookieSettings' },
  { href: '/vilkaar/', key: 'footer.terms' }
] as const;

