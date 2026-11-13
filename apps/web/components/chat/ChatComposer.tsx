'use client';

import { startTransition, useActionState, useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Icon, Notice } from '@respin/ui';
import { firstMessageAction, sendMessageAction, type ChatState } from '../../lib/conversation-actions';
import { shrinkImage } from '../../lib/shrink-image';

/** Send et billede i en eksisterende samtale (gøres mindre i browseren først; serveren omkoder alligevel) */
async function sendPicture(conversationId: string, file: File): Promise<string | null> {
  try {
    const blob = await shrinkImage(file);
    const res = await fetch(`/api/beskeder/billede/?samtale=${encodeURIComponent(conversationId)}`, { method: 'POST', body: blob, headers: { 'Content-Type': blob.type || 'application/octet-stream' }, credentials: 'same-origin' });
    if (res.ok) return null;
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    return body.error ?? 'Billedet kunne ikke sendes.';
  } catch {
    return 'Ingen forbindelse. Prøv igen.';
  }
}

/**
 * Skriv en besked. Enter sender, Shift+Enter giver ny linje. Feltet tømmes, når beskeden er sendt.
 * Med `listingId` (ingen samtale endnu) oprettes samtalen af den første besked.
 */
export function ChatComposer({ conversationId, listingId, placeholder = 'Skriv en besked…' }: { conversationId?: string; listingId?: string; placeholder?: string }) {
  const [state, action, pending] = useActionState<ChatState, FormData>(listingId ? firstMessageAction : sendMessageAction, undefined);
  const form = useRef<HTMLFormElement>(null);
  const area = useRef<HTMLTextAreaElement>(null);
  const picker = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const [uploading, setUploading] = useState(false);
  const [imgError, setImgError] = useState<string | null>(null);
  const pick = async (file: File | undefined) => {
    if (!file || !conversationId) return;
    setUploading(true); setImgError(null);
    const err = await sendPicture(conversationId, file);
    setUploading(false);
    if (err) setImgError(err); else router.refresh();
  };
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
      {(state?.error || imgError) && <Notice icon="info" warn role="alert">{imgError ?? state?.error}</Notice>}
      <label htmlFor="besked" className="sr-only">Skriv en besked</label>
      {/* Billeder kan kun sendes i en samtale, der findes (den første besked er tekst) */}
      {conversationId && (
        <input ref={picker} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" tabIndex={-1} aria-hidden="true"
          onChange={(e) => { void pick(e.target.files?.[0]); e.target.value = ''; }} />
      )}
      <div className={`flex items-end gap-1 rounded-[24px] border border-stone-300 bg-surface py-1.5 pr-1.5 transition-[border-color,box-shadow] focus-within:border-forest focus-within:shadow-[0_0_0_3px_rgb(14_90_47/0.12)] ${conversationId ? 'pl-1.5' : 'pl-4'}`}>
        {conversationId && (
          <button type="button" onClick={() => picker.current?.click()} disabled={uploading} aria-label={uploading ? 'Sender billede…' : 'Send et billede'} title="Send et billede"
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-slate-700 transition-colors hover:bg-sunken disabled:opacity-50">
            <Icon name={uploading ? 'refresh' : 'image'} size={20} className={uploading ? 'animate-spin' : ''} />
          </button>
        )}
        <textarea ref={area} id="besked" name="body" rows={1} maxLength={2000} required onKeyDown={onKey} placeholder={placeholder}
          className="max-h-40 min-h-9 flex-1 resize-none bg-transparent py-1.5 text-body outline-none [field-sizing:content]" aria-describedby="besked-hint" />
        <button type="submit" disabled={pending} aria-label={pending ? 'Sender…' : 'Send'}
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-forest text-lime transition-opacity hover:opacity-90 disabled:opacity-50">
          <Icon name="send" size={18} />
        </button>
      </div>
      <p id="besked-hint" className="px-2 text-caption text-muted">Enter sender · Shift+Enter giver ny linje</p>
    </form>
  );
}
