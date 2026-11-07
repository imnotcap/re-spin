'use client';

import { useCallback, useSyncExternalStore, type ReactNode } from 'react';
import { DEFAULT_MESSAGES, LOCALE_TAGS, isLocale, translate, type Locale, type Messages } from './index';

/**
 * Valgt sprog i browseren. Serveren og den første visning er altid dansk (ingen hydreringsforskel);
 * et andet valgt sprog hentes bagefter (egen lille fil pr. sprog) og huskes i localStorage.
 */
const STORAGE_KEY = 'respin.lang';
type State = { locale: Locale; dict: Messages };
const SERVER: State = { locale: 'da', dict: DEFAULT_MESSAGES };
let state: State = SERVER;
const listeners = new Set<() => void>();
const cache: Partial<Record<Locale, Messages>> = { da: DEFAULT_MESSAGES };
const loaders: Record<Exclude<Locale, 'da'>, () => Promise<{ default: Messages }>> = {
  en: () => import('./en'), sv: () => import('./sv'), nb: () => import('./nb'), de: () => import('./de')
};

async function apply(locale: Locale) {
  let dict = cache[locale];
  if (!dict) {
    try { dict = cache[locale] = (await loaders[locale as Exclude<Locale, 'da'>]()).default; } catch { return; }
  }
  state = { locale, dict };
  document.documentElement.lang = LOCALE_TAGS[locale].slice(0, 2);
  listeners.forEach((l) => l());
}

let started = false;
function start() {
  if (started || typeof window === 'undefined') return;
  started = true;
  let saved: string | null = null;
  try { saved = window.localStorage.getItem(STORAGE_KEY); } catch { /* blokeret lager: dansk */ }
  if (isLocale(saved) && saved !== 'da') void apply(saved);
  // Skift i en anden fane følges
  window.addEventListener('storage', (e) => { if (e.key === STORAGE_KEY && isLocale(e.newValue)) void apply(e.newValue); });
}

export function setLocale(locale: Locale) {
  try { window.localStorage.setItem(STORAGE_KEY, locale); } catch { /* sproget gælder så kun denne side */ }
  void apply(locale);
}

const subscribe = (cb: () => void) => { start(); listeners.add(cb); return () => { listeners.delete(cb); }; };

export function useI18n() {
  const s = useSyncExternalStore(subscribe, () => state, () => SERVER);
  const t = useCallback((key: string, vars?: Record<string, string | number>, fallback?: string) => translate(s.dict, key, vars, fallback), [s]);
  /** Tal i sprogets format (1.234 / 1,234 / 1 234) */
  const n = useCallback((value: number) => value.toLocaleString(LOCALE_TAGS[s.locale]), [s]);
  return { locale: s.locale, t, n };
}

/**
 * Oversat tekst til brug i server-komponenter: <T k="home.new" />. Serveren viser dansk.
 * `vk` oversætter også pladsholdere: <T k="cat.membersNew" vk={{ cat: 'cat.sko' }} />.
 */
export function T({ k, v, vk, fallback }: { k: string; v?: Record<string, string | number>; vk?: Record<string, string>; fallback?: string }): ReactNode {
  const { t } = useI18n();
  const vars = vk ? { ...v, ...Object.fromEntries(Object.entries(vk).map(([name, key]) => [name, t(key)])) } : v;
  return t(k, vars, fallback);
}
