import Link from 'next/link';
import type { InboxRow } from '../../lib/conversations';
import { shortWhen } from '../../lib/time';

/**
 * Samtaler som liste: varebillede, navn · vare, sidste besked og tidspunkt. Ulæste står med fed og en prik.
 * Bruges i indbakken og som venstre kolonne i en samtale på store skærme (`activeId` markerer den åbne).
 */
export function ConversationList({ rows, activeId }: { rows: InboxRow[]; activeId?: string }) {
  return (
    <ul className="divide-y divide-line">
      {rows.map((r) => {
        const active = r.id === activeId;
        return (
          <li key={r.id}>
            <Link href={`/konto/beskeder/${r.id}/`} aria-current={active ? 'page' : undefined}
              className={`flex items-center gap-3 px-4 py-3 transition-colors hover:bg-sunken ${active ? 'bg-[var(--rs-forest-50)] shadow-[inset_3px_0_0_var(--rs-forest)]' : ''}`}>
              {r.image ? <img src={r.image} alt="" width={48} height={48} loading="lazy" className="h-12 w-12 shrink-0 rounded-md object-cover" /> : <span className="h-12 w-12 shrink-0 rounded-md bg-stone-100" />}
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline justify-between gap-2">
                  <span className={`truncate ${r.unread ? 'font-bold' : 'font-semibold'}`}>{r.otherName}</span>
                  <span className="shrink-0 text-caption text-muted">{shortWhen(r.lastMessageAt)}</span>
                </span>
                <span className="block truncate text-caption text-muted">{r.role === 'buyer' ? 'Du køber' : 'Du sælger'} · {r.listingTitle}</span>
                <span className="flex items-center gap-2">
                  <span className={`min-w-0 flex-1 truncate text-small ${r.unread ? 'font-semibold text-ink' : 'text-slate-700'}`}>{r.preview}</span>
                  {r.unread && <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-forest" aria-label="Ulæst" />}
                </span>
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
