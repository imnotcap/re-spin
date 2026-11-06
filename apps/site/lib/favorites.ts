'use client';

/**
 * Favoritter gemt lokalt i browseren (ingen konto i testversionen).
 * localStorage kan mangle eller kaste (privat browsing, blokerede data) – så virker favoritter
 * bare indtil siden lukkes. Ændringer i én fane slår igennem i andre faner via "storage"-hændelsen.
 */
import { useCallback, useSyncExternalStore } from 'react';

const KEY = 'respin:favoritter';
const EMPTY: readonly string[] = Object.freeze([]);
const listeners = new Set<() => void>();
let memory: string | null = null; // reserve, hvis localStorage ikke virker
let cachedRaw: string | null | undefined;
let cachedList: readonly string[] = EMPTY;

function readRaw(): string | null {
  try { return window.localStorage.getItem(KEY); } catch { return memory; }
}

function parse(raw: string | null): readonly string[] {
  if (!raw) return EMPTY;
  try {
    const v: unknown = JSON.parse(raw);
    // Kun strenge med et rimeligt format – data i localStorage kan være ændret af hvem som helst
    return Array.isArray(v) ? Object.freeze([...new Set(v.filter((x): x is string => typeof x === 'string' && /^[a-z0-9-]{1,80}$/.test(x)))].slice(0, 500)) : EMPTY;
  } catch { return EMPTY; }
}

function snapshot(): readonly string[] {
  const raw = readRaw();
  if (raw !== cachedRaw) { cachedRaw = raw; cachedList = parse(raw); }
  return cachedList;
}

function write(list: readonly string[]) {
  const raw = JSON.stringify(list);
  memory = raw;
  try { window.localStorage.setItem(KEY, raw); } catch { /* bruger hukommelsen */ }
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  const onStorage = (e: StorageEvent) => { if (e.key === KEY || e.key === null) cb(); };
  window.addEventListener('storage', onStorage);
  return () => { listeners.delete(cb); window.removeEventListener('storage', onStorage); };
}

export function useFavorites() {
  const ids = useSyncExternalStore(subscribe, snapshot, () => EMPTY);
  const has = useCallback((id: string) => ids.includes(id), [ids]);
  const set = useCallback((id: string, on: boolean) => {
    const cur = snapshot();
    if (on === cur.includes(id)) return;
    write(on ? [id, ...cur] : cur.filter((x) => x !== id));
  }, []);
  return { ids, has, set, count: ids.length };
}
