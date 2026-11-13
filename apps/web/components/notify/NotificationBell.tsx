'use client';

import Link from 'next/link';
import { useEffect, useId, useRef, useState } from 'react';
import { Icon } from '@respin/ui';
import { patchMe, useMe } from '../../lib/me';
import { shortWhen } from '../../lib/time';

/** Klokke i headeren med de seneste notifikationer (fx at en annonce er gemt som favorit). Åbnes de, markeres alle som læst. */
export function NotificationBell() {
  const me = useMe();
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const id = useId();

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => { if (box.current && !box.current.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onKey); };
  }, [open]);

  if (!me) return null;
  const unread = me.notes.unread;
  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next && unread > 0) {
      void fetch('/api/notifikationer/', { method: 'POST', credentials: 'same-origin' }).catch(() => undefined);
      patchMe((m) => ({ ...m, notes: { unread: 0, items: m.notes.items.map((x) => ({ ...x, read: true })) } }));
    }
  };

  return (
    <div ref={box} className="relative">
      <button type="button" onClick={toggle} aria-expanded={open} aria-controls={id}
        className="relative inline-flex h-tap w-tap items-center justify-center rounded-md text-ink transition-colors hover:bg-sunken">
        <span className="sr-only">{unread > 0 ? `${unread} nye notifikationer` : 'Notifikationer'}</span>
        <Icon name="bell" size={22} />
        {unread > 0 && <span aria-hidden="true" className="absolute right-1 top-1 min-w-[18px] rounded-pill bg-coral-600 px-1 text-center text-[11px] font-bold leading-[18px] text-white">{unread > 99 ? '99+' : unread}</span>}
      </button>
      {open && (
        <div id={id} className="absolute right-0 top-full z-50 mt-2 w-[min(360px,calc(100vw-24px))] overflow-hidden rounded-2xl border border-line bg-surface shadow-float">
          <p className="border-b border-line px-4 py-3 text-body font-bold">Notifikationer</p>
          {me.notes.items.length === 0 ? (
            <p className="px-4 py-6 text-center text-small text-muted">Ingen notifikationer endnu. Når nogen gemmer en af dine annoncer som favorit, står det her.</p>
          ) : (
            <ul className="max-h-96 divide-y divide-line overflow-y-auto">
              {me.notes.items.map((n) => (
                <li key={n.id}>
                  <Link href={n.href} onClick={() => setOpen(false)} className={`flex items-start gap-3 px-4 py-3 hover:bg-sunken ${n.read ? '' : 'bg-[var(--rs-forest-50)]'}`}>
                    <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-50 text-coral-600"><Icon name="heart" size={16} /></span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-small text-ink">{n.text}</span>
                      <span className="block text-caption text-muted">{shortWhen(new Date(n.at))}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
