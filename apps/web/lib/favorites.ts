'use client';

/**
 * Favoritter gemt lokalt i browseren – og, når man er logget ind, også på serveren (/api/favoritter/), så sælgeren
 * kan se, hvor mange der har gemt annoncen, og få besked. Uden login virker de kun i denne browser.
 * localStorage kan mangle eller kaste (privat browsing, blokerede data) – så virker favoritter
 * bare indtil siden lukkes. Ændringer i én fane slår igennem i andre faner via "storage"-hændelsen.
 */
import { useCallback, useSyncExternalStore } from 'react';

const KEY = 'videro:favoritter';
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

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
let loggedIn = false;
let synced = false;
const post = (body: unknown) => {
  void fetch('/api/favoritter/', { method: 'POST', body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin' }).catch(() => undefined);
};

/**
 * Kaldes med serverens liste, når man er logget ind (fra lib/me.ts): de to lister flettes, og favoritter, der kun
 * ligger i browseren, gemmes på serveren (én gang pr. sidevisning). null = logget ud.
 */
export function mergeServerFavorites(serverIds: readonly string[] | null): void {
  loggedIn = serverIds !== null;
  if (!serverIds) { synced = false; return; }
  const cur = snapshot();
  const missingLocally = serverIds.filter((id) => !cur.includes(id));
  if (missingLocally.length) write([...missingLocally, ...cur].slice(0, 500));
  if (!synced) {
    synced = true;
    const onlyLocal = cur.filter((id) => UUID.test(id) && !serverIds.includes(id));
    if (onlyLocal.length) post({ sync: onlyLocal });
  }
}

/** Fjern flere på én gang (fx egne annoncer) */
export function removeFavorites(ids: readonly string[]): void {
  const cur = snapshot();
  const next = cur.filter((x) => !ids.includes(x));
  if (next.length !== cur.length) write(next);
}

export function useFavorites() {
  const ids = useSyncExternalStore(subscribe, snapshot, () => EMPTY);
  const has = useCallback((id: string) => ids.includes(id), [ids]);
  const set = useCallback((id: string, on: boolean) => {
    const cur = snapshot();
    if (on === cur.includes(id)) return;
    write(on ? [id, ...cur] : cur.filter((x) => x !== id));
    if (loggedIn && UUID.test(id)) post({ listingId: id, on });
  }, []);
  return { ids, has, set, count: ids.length };
}
