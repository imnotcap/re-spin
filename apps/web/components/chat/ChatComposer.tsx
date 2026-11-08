'use client';

import { startTransition, useActionState, useEffect, useRef, type FormEvent, type KeyboardEvent } from 'react';
import { Button, Notice } from '@respin/ui';
import { firstMessageAction, sendMessageAction, type ChatState } from '../../lib/conversation-actions';

/**
 * Skriv en besked. Enter sender, Shift+Enter giver ny linje. Feltet tømmes, når beskeden er sendt.
 * Med `listingId` (ingen samtale endnu) oprettes samtalen af den første besked.
 */
export function ChatComposer({ conversationId, listingId, placeholder = 'Skriv en besked…' }: { conversationId?: string; listingId?: string; placeholder?: string }) {
  const [state, action, pending] = useActionState<ChatState, FormData>(listingId ? firstMessageAction : sendMessageAction, undefined);
  const form = useRef<HTMLFormElement>(null);
  const area = useRef<HTMLTextAreaElement>(null);
  useEffect(() => { if (state?.sent && area.current) { area.current.value = ''; area.current.focus(); } }, [state?.sent]);
  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!area.current?.value.trim()) return;
    const fd = new FormData(e.currentTarget);
    startTransition(() => action(fd));
  };
  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); form.current?.requestSubmit(); }
  };
  return (
    <form ref={form} onSubmit={submit} className="flex flex-col gap-2">
      {listingId ? <input type="hidden" name="listingId" value={listingId} /> : <input type="hidden" name="conversationId" value={conversationId} />}
      {state?.error && <Notice icon="info" warn role="alert">{state.error}</Notice>}
      <label htmlFor="besked" className="sr-only">Skriv en besked</label>
      <div className="flex items-end gap-2 rounded-lg border border-line bg-surface p-2 focus-within:border-forest">
        <textarea ref={area} id="besked" name="body" rows={2} maxLength={2000} required onKeyDown={onKey} placeholder={placeholder}
          className="max-h-48 min-h-11 flex-1 resize-y bg-transparent px-2 py-2 text-body outline-none focus-visible:outline-none [field-sizing:content]" aria-describedby="besked-hint" />
        <Button type="submit" icon="send" disabled={pending}>{pending ? 'Sender…' : 'Send'}</Button>
      </div>
      <p id="besked-hint" className="px-1 text-caption text-muted">Enter sender · Shift+Enter giver ny linje · Del aldrig betaling eller telefonnummer – så mister du køberbeskyttelsen</p>
    </form>
  );
}
