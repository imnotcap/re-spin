'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { Avatar, Icon } from '@respin/ui';
import { useLivePolling, useMe } from '../../lib/me';

type Toast = { key: string; title: string; text: string; href: string; icon: 'chat' | 'heart'; who?: string };

const SEEN = 'videro:notify:seen';
const readSeen = (): string => { try { return sessionStorage.getItem(SEEN) ?? ''; } catch { return ''; } };
const writeSeen = (v: string) => { try { sessionStorage.setItem(SEEN, v); } catch { /* privat browsing */ } };

/**
 * Viser en klikbar notifikation nederst i hjørnet, når der kommer en ny besked eller en ny favorit, mens man er på
 * siden (fx inde på en annonce). Ikke på selve samtalen, beskeden handler om – den opdaterer sig selv. Hver
 * besked/notifikation vises kun én gang pr. fane. Står i 10 sekunder (eller til den lukkes).
 */
export function LiveNotifier() {
  useLivePolling();
  const me = useMe();
  const pathname = usePathname();
  // Kø: kommer der flere på én gang (fx en besked og en favorit), vises de efter hinanden – beskeder først
  const [queue, setQueue] = useState<Toast[]>([]);
  const toast = queue[0] ?? null;
  const timer = useRef<number | undefined>(undefined);
  const next = () => setQueue((q) => q.slice(1));

  useEffect(() => {
    if (!me) return;
    const seen = readSeen();
    const m = me.message;
    const n = me.notes.items.find((x) => !x.read);
    const fresh: Array<{ at: string; t: Toast }> = [];
    if (m && m.at > seen && pathname !== `/konto/beskeder/${m.conversationId}/`) {
      fresh.push({ at: m.at, t: { key: `m-${m.at}`, title: `Ny besked fra ${m.from}`, text: m.preview, href: `/konto/beskeder/${m.conversationId}/`, icon: 'chat', who: m.from } });
    }
    if (n && n.at > seen) fresh.push({ at: n.at, t: { key: `n-${n.id}`, title: 'Ny favorit', text: n.text, href: n.href, icon: 'heart' } });
    if (!fresh.length) {
      // Første gang i fanen: alt, der allerede findes, regnes som set (ingen gamle notifikationer ved sideskift)
      if (!seen) writeSeen(new Date().toISOString());
      return;
    }
    writeSeen(fresh.reduce((max, c) => (c.at > max ? c.at : max), seen));
    setQueue((q) => [...q, ...fresh.map((f) => f.t).filter((t) => !q.some((x) => x.key === t.key))]);
  }, [me, pathname]);

  // Hver notifikation står i 10 sekunder (eller til den lukkes); så kommer den næste
  useEffect(() => {
    if (!toast) return;
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(next, 10_000);
    return () => window.clearTimeout(timer.current);
  }, [toast]);
  // Går man selv ind på siden, notifikationen handler om, forsvinder den
  useEffect(() => { if (toast && pathname === toast.href) next(); }, [pathname, toast]);

  if (!toast) return null;
  return (
    <div key={toast.key} role="status" aria-live="polite"
      className="fixed inset-x-3 bottom-[calc(76px+env(safe-area-inset-bottom))] z-50 mx-auto max-w-sm motion-safe:animate-[rs-mega-in_200ms_ease-out] md:inset-x-auto md:bottom-6 md:right-6">
      <div className="flex items-start gap-3 rounded-2xl border border-line bg-surface p-3 pr-2 shadow-float">
        <Link href={toast.href} onClick={next} className="flex min-w-0 flex-1 items-start gap-3 rounded-lg">
          {toast.who
            ? <Avatar name={toast.who} size="sm" className="mt-0.5 shrink-0" />
            : <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-red-50 text-coral-600"><Icon name={toast.icon} size={16} /></span>}
          <span className="min-w-0">
            <span className="block text-small font-bold text-ink">{toast.title}</span>
            <span className="line-clamp-2 block text-small text-slate-700">{toast.text}</span>
            <span className="mt-1 inline-flex items-center gap-1 text-caption font-semibold text-forest">{toast.icon === 'chat' ? 'Læs og svar' : 'Se annoncen'}<Icon name="arrow" size={12} /></span>
          </span>
        </Link>
        <button type="button" onClick={next} aria-label="Luk" className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted hover:bg-sunken hover:text-ink">
          <Icon name="close" size={16} />
        </button>
      </div>
    </div>
  );
}
