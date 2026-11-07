/** Fælles indhold og konfiguration for hjemmesiden */
export const SITE = {
  name: 're:spin',
  title: 're:spin – køb og sælg brugt tøj, sko og boligting',
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
  { href: '/gebyrer/', label: 'Gebyrer', key: 'nav.fees' },
  { href: '/saadan-virker-det/#faq', label: 'Spørgsmål og svar', key: 'nav.faq' }
] as const;
