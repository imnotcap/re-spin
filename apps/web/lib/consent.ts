/**
 * Cookiesamtykke. Gemmes i browseren (local storage) i 12 måneder; derefter spørges igen.
 * "Nødvendige" er altid til. Statistik og markedsføring bruges ikke i dag – valget gemmes og respekteres,
 * hvis de tages i brug (læs med `hasConsent('statistics')`, før noget sådant indlæses).
 */
import { useMemo, useSyncExternalStore } from 'react';
import { CONSENT_KEY, CONSENT_MAX_AGE_DAYS, CONSENT_VERSION } from './consent-policy';

export { CONSENT_KEY, CONSENT_MAX_AGE_DAYS, CONSENT_VERSION };

export interface Consent { v: number; necessary: true; statistics: boolean; marketing: boolean; at: string }
export type ConsentCategory = 'statistics' | 'marketing';

/** Læs og valider et gemt samtykke. Ugyldigt, forældet eller for gammelt → null (spørg igen). */
export function parseConsent(raw: string | null, now = Date.now()): Consent | null {
  if (!raw) return null;
  try {
    const c = JSON.parse(raw) as Partial<Consent>;
    if (c.v !== CONSENT_VERSION || typeof c.statistics !== 'boolean' || typeof c.marketing !== 'boolean' || typeof c.at !== 'string') return null;
    const at = Date.parse(c.at);
    if (!Number.isFinite(at) || at > now + 60_000 || now - at > CONSENT_MAX_AGE_DAYS * 86_400_000) return null;
    return { v: CONSENT_VERSION, necessary: true, statistics: c.statistics, marketing: c.marketing, at: c.at };
  } catch {
    return null;
  }
}

const listeners = new Set<() => void>();
let memory: string | null = null; // hvis local storage er blokeret, gælder valget resten af besøget
const read = () => { try { return window.localStorage.getItem(CONSENT_KEY); } catch { return memory; } };

export function saveConsent(choice: { statistics: boolean; marketing: boolean }) {
  const raw = JSON.stringify({ v: CONSENT_VERSION, necessary: true, ...choice, at: new Date().toISOString() } satisfies Consent);
  memory = raw;
  try { window.localStorage.setItem(CONSENT_KEY, raw); } catch { /* hukommelsen */ }
  listeners.forEach((l) => l());
}

export function clearConsent() {
  memory = null;
  try { window.localStorage.removeItem(CONSENT_KEY); } catch { /* ingenting */ }
  listeners.forEach((l) => l());
}

const subscribe = (cb: () => void) => {
  listeners.add(cb);
  const onStorage = (e: StorageEvent) => { if (e.key === CONSENT_KEY) cb(); };
  window.addEventListener('storage', onStorage);
  return () => { listeners.delete(cb); window.removeEventListener('storage', onStorage); };
};

/**
 * 'unknown' på serveren og i første visning (ingen forskel ved hydrering), derefter samtykket eller null.
 * Banneret vises kun ved null – aldrig blinkende for den, der allerede har svaret.
 */
export function useConsent(): Consent | null | 'unknown' {
  const raw = useSyncExternalStore(subscribe, read, () => '__server__');
  // Samme objekt, så længe teksten er den samme – ellers udløser `useEffect([consent])` en uendelig løkke
  return useMemo(() => (raw === '__server__' ? 'unknown' : parseConsent(raw)), [raw]);
}

export function hasConsent(category: ConsentCategory): boolean {
  if (typeof window === 'undefined') return false;
  return parseConsent(read())?.[category] === true;
}
