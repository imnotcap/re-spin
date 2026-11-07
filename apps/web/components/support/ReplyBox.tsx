'use client';

import { startTransition, useActionState, useEffect, useRef, type FormEvent, type KeyboardEvent } from 'react';
import { Button, Notice } from '@respin/ui';
import { replyAction, type SupportFormState } from '../../lib/support-actions';

/** Svar i sagen. Enter sender, Shift+Enter giver ny linje. Feltet tømmes, når beskeden er sendt. */
export function ReplyBox({ nr }: { nr: number }) {
  const [state, action, pending] = useActionState<SupportFormState, FormData>(replyAction, undefined);
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
      <input type="hidden" name="nr" value={nr} />
      {state?.error && <Notice icon="info" warn role="alert">{state.error}</Notice>}
      <label htmlFor="svar" className="sr-only">Skriv et svar</label>
      <div className="flex items-end gap-2 rounded-lg border border-line bg-surface p-2 focus-within:border-forest">
        <textarea ref={area} id="svar" name="body" rows={2} maxLength={4000} required onKeyDown={onKey} placeholder="Skriv et svar…"
          className="max-h-48 min-h-11 flex-1 resize-y bg-transparent px-2 py-2 text-body outline-none focus-visible:outline-none [field-sizing:content]" aria-describedby="svar-hint" />
        <Button type="submit" icon="send" disabled={pending}>{pending ? 'Sender…' : 'Send'}</Button>
      </div>
      <p id="svar-hint" className="px-1 text-caption text-muted">Enter sender · Shift+Enter giver ny linje</p>
    </form>
  );
}
