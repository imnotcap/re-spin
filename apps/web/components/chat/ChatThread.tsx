import { Avatar, Badge, Button, Icon } from '@respin/ui';
import { offerResponseAction } from '../../lib/conversation-actions';
import type { ThreadMessage, ThreadOffer } from '../../lib/conversations';
import { MessageText } from './MessageText';

const TZ = 'Europe/Copenhagen';
const clock = (d: Date) => d.toLocaleTimeString('da-DK', { hour: '2-digit', minute: '2-digit', timeZone: TZ });
const dayKey = (d: Date) => d.toLocaleDateString('en-CA', { timeZone: TZ });
const dayLabel = (d: Date, now: Date) => {
  if (dayKey(d) === dayKey(now)) return 'I dag';
  if (dayKey(d) === dayKey(new Date(now.getTime() - 86_400_000))) return 'I går';
  const s = d.toLocaleDateString('da-DK', { weekday: 'long', day: 'numeric', month: 'long', timeZone: TZ });
  return s.charAt(0).toUpperCase() + s.slice(1);
};
const until = (d: Date) => d.toLocaleString('da-DK', { weekday: 'short', hour: '2-digit', minute: '2-digit', timeZone: TZ });
const kr = (ore: number) => `${(ore / 100).toLocaleString('da-DK', { minimumFractionDigits: ore % 100 ? 2 : 0, maximumFractionDigits: 2 })} kr.`;
const STATUS: Record<string, { label: string; tone: 'forest' | 'warn' | 'neutral' | 'coral' }> = {
  pending: { label: 'Venter på svar', tone: 'warn' }, accepted: { label: 'Accepteret', tone: 'forest' }, declined: { label: 'Afvist', tone: 'coral' },
  withdrawn: { label: 'Trukket tilbage', tone: 'neutral' }, expired: { label: 'Udløbet', tone: 'neutral' }
};
/** Beskeder fra samme person inden for 5 minutter står samlet, med tid og profilbillede kun ved den sidste */
const GROUP_MS = 5 * 60_000;

type Item =
  | { type: 'day'; key: string; label: string }
  | { type: 'event'; m: ThreadMessage }
  | { type: 'offer'; m: ThreadMessage }
  | { type: 'text'; m: ThreadMessage; first: boolean; last: boolean };

function layout(messages: ThreadMessage[], now: Date): Item[] {
  const out: Item[] = [];
  let day = '';
  messages.forEach((m, i) => {
    const k = dayKey(m.createdAt);
    if (k !== day) { day = k; out.push({ type: 'day', key: k, label: dayLabel(m.createdAt, now) }); }
    if (m.kind.startsWith('offer_')) { out.push({ type: 'event', m }); return; }
    if (m.kind === 'offer' && m.offerId) { out.push({ type: 'offer', m }); return; }
    const same = (o?: ThreadMessage) => !!o && (o.kind === 'text' || o.kind === 'image') && o.mine === m.mine && dayKey(o.createdAt) === k && Math.abs(o.createdAt.getTime() - m.createdAt.getTime()) < GROUP_MS;
    out.push({ type: 'text', m, first: !same(messages[i - 1]), last: !same(messages[i + 1]) });
  });
  return out;
}

/**
 * Samtalen: egne beskeder til højre (skovgrønne), den anden part til venstre med profilbillede. Beskeder grupperes,
 * og tid står kun under den sidste i en gruppe – under egne beskeder også "Sendt" eller "Læst" (den anden part har åbnet
 * samtalen efter beskeden). Billeder vises via /api/beskeder/billede/ (kun for parterne), og links advarer. Bud vises som kort med
 * svar-knapper til sælgeren (eller "Træk tilbage" til køberen), og mistænkelige beskeder får en advarsel. Ren tekst – React escaper.
 */
export function ChatThread({ conversationId, messages, offers, role, other, otherReadAt, now = new Date() }: {
  conversationId: string; messages: ThreadMessage[]; offers: ThreadOffer[]; role: 'buyer' | 'seller';
  other: { name: string; avatar: string | null }; otherReadAt: Date | null; now?: Date;
}) {
  const offerById = new Map(offers.map((o) => [o.id, o]));
  const avatar = <Avatar name={other.name} src={other.avatar ?? undefined} size="sm" className="shrink-0" />;
  const spacer = <span className="w-7 shrink-0" aria-hidden="true" />;

  return (
    <ol className="flex flex-col gap-1" aria-label={`Samtale med ${other.name}`}>
      {layout(messages, now).map((it) => {
        if (it.type === 'day') {
          return <li key={`d-${it.key}`} className="my-3 self-center rounded-pill bg-stone-100 px-3 py-1 text-caption font-semibold text-muted">{it.label}</li>;
        }
        const m = it.m;
        if (it.type === 'event') {
          return <li key={m.id} className="my-2 self-center rounded-pill border border-line bg-surface px-3 py-1 text-caption text-muted">{m.mine ? 'Du' : other.name}: {m.body} · {clock(m.createdAt)}</li>;
        }
        if (it.type === 'offer') {
          const o = offerById.get(m.offerId!);
          const st = STATUS[o?.status ?? 'pending']!;
          const open = o?.status === 'pending';
          const card = (
            <div className="w-full max-w-xs rounded-2xl border border-line bg-surface p-4">
              <p className="flex items-center justify-between gap-2 text-caption"><b className="text-ink">{m.mine ? 'Dit bud' : `Bud fra ${other.name}`}</b><Badge tone={st.tone}>{open && role === 'seller' ? 'Venter på dig' : st.label}</Badge></p>
              <p className="mt-1 text-[28px] font-extrabold leading-tight tabular-nums">{o ? kr(o.amountOre) : m.body}</p>
              <p className="text-caption text-muted">{open && o ? `Gælder til ${until(o.expiresAt)}` : clock(m.createdAt)}</p>
              {open && o && (
                <form action={offerResponseAction} className="mt-3 flex flex-wrap gap-2">
                  <input type="hidden" name="offerId" value={o.id} />
                  <input type="hidden" name="conversationId" value={conversationId} />
                  {role === 'seller'
                    ? <><Button type="submit" name="action" value="accept" size="sm" icon="check">Accepter</Button><Button type="submit" name="action" value="decline" size="sm" variant="outline">Afvis</Button></>
                    : <Button type="submit" name="action" value="withdraw" size="sm" variant="outline">Træk buddet tilbage</Button>}
                </form>
              )}
            </div>
          );
          return (
            <li key={m.id} className={`my-2 flex items-end gap-2 ${m.mine ? 'justify-end' : ''}`}>
              {!m.mine && avatar}{card}
            </li>
          );
        }
        const corner = m.mine
          ? `${it.first ? '' : 'rounded-tr-md'} ${it.last ? '' : 'rounded-br-md'}`
          : `${it.first ? '' : 'rounded-tl-md'} ${it.last ? '' : 'rounded-bl-md'}`;
        return (
          <li key={m.id} className={`flex flex-col ${m.mine ? 'items-end' : 'items-start'} ${it.first ? 'mt-2' : ''}`}>
            {!m.mine && m.risk === 'high' && (
              <p role="note" className="mb-1 ml-9 flex max-w-md items-start gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-small text-amber-900">
                <Icon name="shield" size={16} className="mt-0.5 shrink-0" />
                <span><b>Pas på:</b> beskeden nævner betaling eller kontakt uden om Videro. Betal altid her på siden – ellers mister du køberbeskyttelsen.</span>
              </p>
            )}
            <div className={`flex max-w-[85%] items-end gap-2 sm:max-w-[70%] ${m.mine ? 'flex-row-reverse' : ''}`}>
              {!m.mine && (it.last ? avatar : spacer)}
              {m.image ? (
                <a href={`/api/beskeder/billede/${m.id}/?str=stor`} target="_blank" rel="noopener" className={`block overflow-hidden rounded-[18px] border border-line bg-stone-100 ${corner}`}>
                  <img src={`/api/beskeder/billede/${m.id}/`} alt={m.mine ? 'Billede, du har sendt' : `Billede fra ${other.name}`} loading="lazy" decoding="async"
                    className="block max-h-72 w-auto max-w-[min(280px,70vw)] object-cover" />
                </a>
              ) : (
                <div className={`whitespace-pre-line break-words rounded-[18px] px-4 py-2 text-body ${corner} ${m.mine ? 'bg-forest text-white' : 'border border-line bg-surface text-ink'}`}>
                  <span className="sr-only">{m.mine ? 'Dig' : other.name}: </span><MessageText body={m.body} mine={m.mine} />
                </div>
              )}
            </div>
            {it.last && (
              <span className={`mt-1 text-caption text-muted ${m.mine ? 'mr-1' : 'ml-10'}`}>
                <time dateTime={m.createdAt.toISOString()}>{clock(m.createdAt)}</time>
                {m.mine && <> · {otherReadAt && otherReadAt >= m.createdAt ? <span className="font-semibold text-forest">Læst</span> : 'Sendt'}</>}
              </span>
            )}
          </li>
        );
      })}
    </ol>
  );
}
