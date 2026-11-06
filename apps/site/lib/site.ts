/** Fælles indhold og konfiguration for hjemmesiden */
export const SITE = {
  name: 're:spin',
  title: 're:spin – giv tøjet nyt liv',
  description: 'Dansk markedsplads for brugt tøj, sko og boligting. Gratis at oprette annoncer, køberbeskyttelse på alle køb, og log ind med passkey.',
  /** Testversion: må ikke indekseres og lover ikke en rigtig tjeneste */
  isTest: true
} as const;

export const NAV = [
  { href: '/#saadan', label: 'Sådan virker det' },
  { href: '/gebyrer/', label: 'Gebyrer' },
  { href: '/sikkerhed/', label: 'Tryghed' },
  { href: '/#faq', label: 'Spørgsmål' }
] as const;
