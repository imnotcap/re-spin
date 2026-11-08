import { Badge, Button, Icon } from '@respin/ui';
import { offerResponseAction } from '../../lib/conversation-actions';
import type { ThreadMessage, ThreadOffer } from '../../lib/conversations';

const time = (d: Date) => d.toLocaleString('da-DK', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Copenhagen' });
const kr = (ore: number) => `${(ore / 100).toLocaleString('da-DK', { minimumFractionDigits: ore % 100 ? 2 : 0, maximumFractionDigits: 2 })} kr.`;
const STATUS: Record<string, { label: string; tone: 'forest' | 'warn' | 'neutral' | 'coral' }> = {
  pending: { label: 'Venter på svar', tone: 'warn' }, accepted: { label: 'Accepteret', tone: 'forest' }, declined: { label: 'Afvist', tone: 'coral' },
  withdrawn: { label: 'Trukket tilbage', tone: 'neutral' }, expired: { label: 'Udløbet', tone: 'neutral' }
};

/**
 * Samtalen: egne beskeder til højre, den anden part til venstre. Bud vises som kort med svar-knapper til sælgeren
 * (eller "Træk tilbage" til køberen). Mistænkelige beskeder fra den anden part får en advarsel. Ren tekst – React escaper.
 */
export function ChatThread({ conversationId, messages, offers, role, otherName }: { conversationId: string; messages: ThreadMessage[]; offers: ThreadOffer[]; role: 'buyer' | 'seller'; otherName: string }) {
  const offerById = new Map(offers.map((o) => [o.id, o]));
  return (
    <ol className="flex flex-col gap-4" aria-label="Samtale">
      {messages.map((m) => {
        if (m.kind.startsWith('offer_')) {
          return <li key={m.id} className="self-center rounded-pill bg-surface px-3 py-1 text-caption text-muted">{m.mine ? 'Du' : otherName}: {m.body} · {time(m.createdAt)}</li>;
        }
        if (m.kind === 'offer' && m.offerId) {
          const o = offerById.get(m.offerId);
          const st = STATUS[o?.status ?? 'pending']!;
          const open = o?.status === 'pending';
          return (
            <li key={m.id} className={`w-full max-w-sm rounded-lg border border-line bg-surface p-4 ${m.mine ? 'self-end' : 'self-start'}`}>
              <p className="flex items-center justify-between gap-2 text-caption text-muted"><span><b className="text-slate-700">{m.mine ? 'Dit bud' : `Bud fra ${otherName}`}</b> · {time(m.createdAt)}</span><Badge tone={st.tone}>{st.label}</Badge></p>
              <p className="mt-1 text-[26px] font-extrabold tabular-nums">{o ? kr(o.amountOre) : m.body}</p>
              {open && o && <p className="text-caption text-muted">Gælder til {time(o.expiresAt)}</p>}
              {open && o && (
                <form action={offerResponseAction} className="mt-3 flex flex-wrap gap-2">
                  <input type="hidden" name="offerId" value={o.id} />
                  <input type="hidden" name="conversationId" value={conversationId} />
                  {role === 'seller'
                    ? <><Button type="submit" name="action" value="accept" size="sm" icon="check">Accepter</Button><Button type="submit" name="action" value="decline" size="sm" variant="outline">Afvis</Button></>
                    : <Button type="submit" name="action" value="withdraw" size="sm" variant="outline">Træk buddet tilbage</Button>}
                </form>
              )}
            </li>
          );
        }
        return (
          <li key={m.id} className={`flex max-w-[85%] flex-col gap-1 sm:max-w-[75%] ${m.mine ? 'items-end self-end' : 'items-start self-start'}`}>
            <span className="px-1 text-caption text-muted"><span className="font-semibold text-slate-700">{m.mine ? 'Dig' : otherName}</span> · <time dateTime={m.createdAt.toISOString()}>{time(m.createdAt)}</time></span>
            {!m.mine && m.risk === 'high' && (
              <p role="note" className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-small text-amber-900">
                <Icon name="shield" size={16} className="mt-0.5 shrink-0" />
                <span><b>Pas på:</b> beskeden nævner betaling eller kontakt uden om Videro. Betal altid her på siden – ellers mister du køberbeskyttelsen.</span>
              </p>
            )}
            <p className={`whitespace-pre-line break-words rounded-2xl px-4 py-2.5 text-body ${m.mine ? 'rounded-br-md bg-forest text-white' : 'rounded-bl-md border border-line bg-surface text-ink'}`}>{m.body}</p>
          </li>
        );
      })}
    </ol>
  );
}
