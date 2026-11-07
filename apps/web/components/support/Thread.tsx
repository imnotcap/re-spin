import type { ThreadMessage } from '@respin/support';

const time = (d: Date) => d.toLocaleString('da-DK', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Copenhagen' });

/**
 * Samtalen i en sag, set fra kunden: egne beskeder til højre, re:spin til venstre med medarbejderens fornavn.
 * Teksten vises som ren tekst (React escaper), linjeskift bevares.
 */
export function Thread({ messages, me = 'customer' }: { messages: ThreadMessage[]; me?: 'customer' | 'staff' }) {
  return (
    <ol className="flex flex-col gap-4" aria-label="Samtale">
      {messages.map((m) => {
        if (m.authorType === 'system') {
          return <li key={m.id} className="self-center rounded-pill bg-sunken px-3 py-1 text-caption text-muted">{m.body} · {time(m.createdAt)}</li>;
        }
        const mine = m.authorType === me;
        const who = m.authorType === 'customer' ? (me === 'customer' ? 'Dig' : 'Kunden') : `${m.authorName ?? 'Kundeservice'} fra re:spin`;
        return (
          <li key={m.id} className={`flex max-w-[85%] flex-col gap-1 sm:max-w-[75%] ${mine ? 'items-end self-end' : 'items-start self-start'}`}>
            <span className="px-1 text-caption text-muted"><span className="font-semibold text-slate-700">{who}</span> · <time dateTime={m.createdAt.toISOString()}>{time(m.createdAt)}</time></span>
            <p className={`whitespace-pre-line break-words rounded-2xl px-4 py-2.5 text-body ${mine ? 'rounded-br-md bg-forest text-white' : 'rounded-bl-md border border-line bg-surface text-ink'}`}>{m.body}</p>
          </li>
        );
      })}
    </ol>
  );
}
