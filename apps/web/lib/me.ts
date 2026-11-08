'use client';

/**
 * Hvem er logget ind – delt mellem header, bundmenu og varekort, så /api/me kun hentes én gang pr. sideskift.
 * `listingIds` er brugerens egne annoncer: dem kan man ikke sætte hjerte på. `unread`: samtaler med ulæste beskeder.
 */
import { useSyncExternalStore } from 'react';
import { removeFavorites } from './favorites';

export interface Me { name: string; listingIds: readonly string[]; unread: number }

let current: Me | null = null;
let inflight: AbortController | null = null;
const listeners = new Set<() => void>();
const NO_IDS: ReadonlySet<string> = new Set();
let ownIds: ReadonlySet<string> = NO_IDS;

function set(me: Me | null) {
  current = me;
  ownIds = me?.listingIds.length ? new Set(me.listingIds) : NO_IDS;
  // Egne annoncer, der står i favoritterne fra før, fjernes
  if (me?.listingIds.length) removeFavorites(me.listingIds);
  listeners.forEach((l) => l());
}

/** Hent igen (fx efter log ind/ud eller en ny annonce) */
export function refreshMe(): void {
  if (process.env.NEXT_PUBLIC_AUTH_ENABLED !== '1') return;
  inflight?.abort();
  const ctrl = (inflight = new AbortController());
  fetch('/api/me/', { cache: 'no-store', credentials: 'same-origin', signal: ctrl.signal })
    .then((r) => (r.ok ? r.json() : null))
    .then((d: unknown) => {
      const o = d && typeof d === 'object' ? (d as { name?: unknown; listingIds?: unknown; unread?: unknown }) : null;
      const ids = Array.isArray(o?.listingIds) ? o.listingIds.filter((x): x is string => typeof x === 'string') : [];
      const unread = typeof o?.unread === 'number' && o.unread > 0 ? Math.floor(o.unread) : 0;
      set(o && typeof o.name === 'string' ? { name: o.name, listingIds: ids, unread } : null);
    })
    .catch((e: unknown) => { if (!(e instanceof DOMException && e.name === 'AbortError')) set(null); });
}

const subscribe = (cb: () => void) => { listeners.add(cb); return () => listeners.delete(cb); };

export const useMe = (): Me | null => useSyncExternalStore(subscribe, () => current, () => null);
/** Er annoncen min egen? */
export const useOwnListingIds = (): ReadonlySet<string> => useSyncExternalStore(subscribe, () => ownIds, () => NO_IDS);
