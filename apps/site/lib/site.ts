/** Fælles indhold og konfiguration for hjemmesiden */
export const SITE = {
  name: 're:spin',
  title: 're:spin – køb og sælg brugt tøj, sko og boligting',
  description: 'Dansk markedsplads for brugt tøj, sko og boligting. Gratis at oprette annoncer, og køberbeskyttelse på alle køb.',
  /** Testversion: må ikke indekseres og lover ikke en rigtig tjeneste */
  isTest: true
} as const;

/** Basis-sti på GitHub Pages ("/re-spin"); tom lokalt og ved eget domæne */
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? '';

/** Hjælp og information – i topbjælken, mobilmenuen og footeren */
export const HELP_NAV = [
  { href: '/saadan-virker-det/', label: 'Sådan virker det' },
  { href: '/sikkerhed/', label: 'Køberbeskyttelse' },
  { href: '/gebyrer/', label: 'Gebyrer' },
  { href: '/saadan-virker-det/#faq', label: 'Spørgsmål og svar' }
] as const;
