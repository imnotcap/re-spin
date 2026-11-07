/** Sprog på siden. Dansk er standard og renderes på serveren; de andre hentes i browseren, når de vælges. */
import da, { type MessageKey, type Messages } from './da';

export const LOCALES = ['da', 'en', 'sv', 'nb', 'de'] as const;
export type Locale = (typeof LOCALES)[number];
export type { MessageKey, Messages };

/** Navn på sproget på sproget selv (sådan vises de i vælgeren) */
export const LOCALE_NAMES: Record<Locale, string> = { da: 'Dansk', en: 'English', sv: 'Svenska', nb: 'Norsk', de: 'Deutsch' };
/** Til <html lang> og tal-/datoformat */
export const LOCALE_TAGS: Record<Locale, string> = { da: 'da-DK', en: 'en-GB', sv: 'sv-SE', nb: 'nb-NO', de: 'de-DE' };

export const isLocale = (v: unknown): v is Locale => typeof v === 'string' && (LOCALES as readonly string[]).includes(v);

export const DEFAULT_MESSAGES: Messages = da;

/** Indsæt {pladsholdere}. Ukendte nøgler falder tilbage til dansk og derefter til `fallback` eller nøglen selv. */
export function translate(dict: Partial<Messages>, key: string, vars?: Record<string, string | number>, fallback?: string): string {
  let s = (dict as Record<string, string | undefined>)[key] ?? (da as Record<string, string | undefined>)[key] ?? fallback ?? key;
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.split(`{${k}}`).join(String(v));
  return s;
}
