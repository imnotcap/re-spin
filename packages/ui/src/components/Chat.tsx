import { useRef, type FormEvent, type HTMLAttributes, type ReactNode } from 'react';
import { cx } from '../utils';
import { IconButton } from './Button';

export function ChatThread({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cx('rs-chat', className)} {...rest} />;
}

export function ChatDay({ children }: { children: ReactNode }) {
  return <div className="rs-chat__day">{children}</div>;
}

export function ChatBubble({ from = 'them', time, children }: { from?: 'me' | 'them'; time?: string; children: ReactNode }) {
  return (
    <div className={cx('rs-bubble', from === 'me' ? 'rs-bubble--out' : 'rs-bubble--in')}>
      {children}
      {time && <div className="rs-bubble__time">{time}</div>}
    </div>
  );
}

/** Bud i en samtale. `status` er typisk en <Badge>. */
export function OfferCard({ amount, from = 'me', label, status }: { amount: ReactNode; from?: 'me' | 'them'; label?: string; status?: ReactNode }) {
  return (
    <div className={cx('rs-offer', from === 'them' && 'rs-offer--in')}>
      <div className="rs-t-caption rs-t-muted">{label ?? (from === 'me' ? 'Dit bud' : 'Bud')}</div>
      <div className="rs-t-h2 rs-t-price">{amount}</div>
      {status && <div style={{ marginTop: 8 }}>{status}</div>}
    </div>
  );
}

/** Skrivefelt til chat (send med Enter eller knap). */
export function Composer({ onSend, placeholder = 'Skriv en besked…' }: { onSend: (text: string) => void; placeholder?: string }) {
  const ref = useRef<HTMLInputElement>(null);
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const text = ref.current?.value.trim();
    if (!text) return;
    onSend(text);
    if (ref.current) ref.current.value = '';
  };
  return (
    <form className="rs-composer" onSubmit={submit}>
      <input ref={ref} className="rs-input" placeholder={placeholder} aria-label="Besked" autoComplete="off" />
      <IconButton icon="send" label="Send" variant="soft" type="submit" />
    </form>
  );
}
