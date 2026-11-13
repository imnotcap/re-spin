'use client';

/**
 * Hvem er logget ind – delt mellem header, bundmenu, varekort og notifikationer, så /api/me kun hentes ét sted.
 * Hentes ved sideskift og hvert 20. sekund, mens fanen er synlig (se useLivePolling) – det registrerer også, at man
 * er på siden, så nye beskeder vises som notifikation her i stedet for at give mail.
 * `listingIds` er brugerens egne annoncer: dem kan man ikke sætte hjerte på. `unread`: samtaler med ulæste beskeder.
 */
import { useEffect, useSyncExternalStore } from 'react';
import { mergeServerFavorites, removeFavorites } from './favorites';

export interface MeMessage { conversationId: string; from: string; preview: string; at: string }
export interface MeNote { id: string; kind: 'favorite'; text: string; href: string; at: string; read: boolean }
export interface Me {
  name: string; listingIds: readonly string[]; unread: number;
  /** Profilbillede (null = forbogstavet) */ avatar: string | null;
  /** Favoritter gemt på serveren (tælles med i annoncernes favorit-antal) */ favorites: readonly string[];
  /** Nyeste ulæste besked (til notifikationen "Ny besked fra …") */ message: MeMessage | null;
  notes: { unread: number; items: readonly MeNote[] };
}

export const POLL_MS = 20_000;
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
  mergeServerFavorites(me ? me.favorites : null);
  listeners.forEach((l) => l());
}

const str = (v: unknown, max = 300) => (typeof v === 'string' ? v.slice(0, max) : null);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/** Svaret fra /api/me valideres felt for felt – kun kendte felter og formater bruges */
export function parseMe(d: unknown): Me | null {
  const o = d && typeof d === 'object' ? (d as Record<string, unknown>) : null;
  if (!o || typeof o.name !== 'string') return null;
  const ids = Array.isArray(o.listingIds) ? o.listingIds.filter((x): x is string => typeof x === 'string') : [];
  const favorites = Array.isArray(o.favorites) ? o.favorites.filter((x): x is string => typeof x === 'string' && UUID.test(x)) : [];
  const unread = typeof o.unread === 'number' && o.unread > 0 ? Math.floor(o.unread) : 0;
  // Kun egne adresser (/api/billeder/…) eller https (billedlageret) – aldrig fx javascript:
  const avatar = typeof o.avatar === 'string' && /^(\/|https:\/\/)/.test(o.avatar) ? o.avatar : null;
  const m = o.message && typeof o.message === 'object' ? (o.message as Record<string, unknown>) : null;
  const message = m && typeof m.conversationId === 'string' && UUID.test(m.conversationId) && str(m.from) && str(m.at)
    ? { conversationId: m.conversationId, from: str(m.from, 60)!, preview: str(m.preview, 200) ?? '', at: str(m.at)! } : null;
  const n = o.notes && typeof o.notes === 'object' ? (o.notes as Record<string, unknown>) : null;
  const items = Array.isArray(n?.items) ? n.items.flatMap((x): MeNote[] => {
    const i = x && typeof x === 'object' ? (x as Record<string, unknown>) : null;
    // Kun interne stier (aldrig andre domæner eller javascript:)
    return i && typeof i.id === 'string' && i.kind === 'favorite' && typeof i.href === 'string' && /^\/[a-z0-9/-]*$/.test(i.href) && str(i.text) && str(i.at)
      ? [{ id: i.id, kind: 'favorite', text: str(i.text, 200)!, href: i.href, at: str(i.at)!, read: i.read === true }] : [];
  }) : [];
  const notesUnread = typeof n?.unread === 'number' && n.unread > 0 ? Math.floor(n.unread) : 0;
  return { name: o.name, listingIds: ids, unread, avatar, favorites, message, notes: { unread: notesUnread, items } };
}

/** Hent igen (fx efter log ind/ud eller en ny annonce) */
export function refreshMe(): void {
  if (process.env.NEXT_PUBLIC_AUTH_ENABLED !== '1') return;
  inflight?.abort();
  const ctrl = (inflight = new AbortController());
  fetch('/api/me/', { cache: 'no-store', credentials: 'same-origin', signal: ctrl.signal })
    .then((r) => (r.ok ? r.json() : null))
    .then((d: unknown) => set(parseMe(d)))
    .catch((e: unknown) => { if (!(e instanceof DOMException && e.name === 'AbortError')) set(null); });
}

/** Hent /api/me hvert 20. sekund, mens fanen er synlig (og med det samme, når man vender tilbage til fanen) */
export function useLivePolling(): void {
  useEffect(() => {
    if (process.env.NEXT_PUBLIC_AUTH_ENABLED !== '1') return;
    const tick = () => { if (document.visibilityState === 'visible') refreshMe(); };
    const timer = window.setInterval(tick, POLL_MS);
    document.addEventListener('visibilitychange', tick);
    return () => { window.clearInterval(timer); document.removeEventListener('visibilitychange', tick); };
  }, []);
}

/** Lokal opdatering, fx når klokken åbnes og alt er markeret som læst */
export function patchMe(fn: (me: Me) => Me): void { if (current) set(fn(current)); }

const subscribe = (cb: () => void) => { listeners.add(cb); return () => listeners.delete(cb); };

export const useMe = (): Me | null => useSyncExternalStore(subscribe, () => current, () => null);
/**
 * Favorit-antal til visning: serverens antal tæller allerede ens eget hjerte, hvis det er gemt dér – så trækkes det
 * fra, og ens nuværende valg i browseren lægges til. (Uden login tæller serveren aldrig ens hjerte.)
 */
export function useFavoriteCount(id: string, serverCount: number, on: boolean): number {
  const me = useMe();
  const counted = !!me?.favorites.includes(id);
  return Math.max(0, serverCount - (counted ? 1 : 0)) + (on ? 1 : 0);
}

/** Er annoncen min egen? */
export const useOwnListingIds = (): ReadonlySet<string> => useSyncExternalStore(subscribe, () => ownIds, () => NO_IDS);
