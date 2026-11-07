'use client';

import { startTransition, useActionState, useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { replyAction, type ActionState } from '../lib/actions';
import { MACROS } from '../lib/labels';

/**
 * Svarfelt i en sag: "Svar kunden" eller "Intern note", standardsvar og status efter svaret.
 * Ctrl/Cmd+Enter sender. Feltet tømmes, når svaret er sendt.
 */
export function Composer({ caseId, customerFirstName, myName }: { caseId: string; customerFirstName: string; myName: string }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(replyAction, undefined);
  const [internal, setInternal] = useState(false);
  const area = useRef<HTMLTextAreaElement>(null);
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => { if (state?.at && area.current) { area.current.value = ''; area.current.focus(); } }, [state?.at]);

  const insert = (id: string) => {
    const m = MACROS.find((x) => x.id === id);
    const el = area.current;
    if (!m || !el) return;
    const text = m.text.replaceAll('{navn}', customerFirstName).replaceAll('{mig}', myName);
    const at = el.selectionStart ?? el.value.length;
    el.value = el.value.slice(0, at) + text + el.value.slice(el.selectionEnd ?? at);
    el.focus();
  };
  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!area.current?.value.trim()) return;
    const fd = new FormData(e.currentTarget);
    startTransition(() => action(fd));
  };
  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); form.current?.requestSubmit(); } };

  return (
    <form ref={form} onSubmit={submit} className={`rounded-lg border bg-surface ${internal ? 'border-amber-300' : 'border-line'}`}>
      <input type="hidden" name="caseId" value={caseId} />
      <input type="hidden" name="internal" value={internal ? '1' : '0'} />
      <div role="tablist" aria-label="Type" className="flex gap-1 border-b border-line px-2 pt-2">
        {[{ v: false, l: 'Svar kunden' }, { v: true, l: 'Intern note' }].map((t) => (
          <button key={t.l} type="button" role="tab" aria-selected={internal === t.v} onClick={() => setInternal(t.v)}
            className={`rounded-t-md px-3 py-2 text-small font-semibold ${internal === t.v ? (t.v ? 'bg-amber-50 text-amber-900' : 'bg-sunken text-ink') : 'text-muted hover:text-ink'}`}>{t.l}</button>
        ))}
      </div>
      <label htmlFor="reply" className="sr-only">{internal ? 'Intern note (ses ikke af kunden)' : 'Svar til kunden'}</label>
      <textarea ref={area} id="reply" name="body" rows={6} maxLength={4000} required onKeyDown={onKey}
        placeholder={internal ? 'Note til kolleger – kunden kan ikke se den' : `Skriv til ${customerFirstName}…`}
        className={`block w-full resize-y px-4 py-3 text-body outline-none ${internal ? 'bg-amber-50/60' : ''}`} />
      <div className="flex flex-wrap items-center gap-2 border-t border-line px-3 py-2.5">
        <label className="sr-only" htmlFor="macro">Indsæt standardsvar</label>
        <select id="macro" value="" onChange={(e) => insert(e.target.value)} className="h-9 rounded-md border border-line bg-surface px-2 text-small">
          <option value="">Standardsvar…</option>
          {MACROS.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
        </select>
        <span className="flex-1" />
        <label htmlFor="after" className="text-small text-muted">{internal ? 'Status' : 'Bagefter'}</label>
        <select id="after" name="status" defaultValue="" className="h-9 rounded-md border border-line bg-surface px-2 text-small">
          {internal ? <option value="">Uændret</option> : <option value="pending_customer">Venter på kunden</option>}
          <option value="resolved">Løst</option>
          <option value="open">Åben</option>
        </select>
        <button type="submit" disabled={pending} className={`h-9 rounded-md px-4 text-small font-semibold text-white disabled:opacity-60 ${internal ? 'bg-amber-700' : 'bg-forest'}`}>
          {pending ? 'Sender…' : internal ? 'Gem note' : 'Send svar'}
        </button>
      </div>
      <p aria-live="polite" className="px-4 pb-2 text-caption">
        {state?.error ? <span className="text-red-700">{state.error}</span> : state?.ok ? <span className="text-forest">{state.ok}</span> : <span className="text-muted">Ctrl/Cmd+Enter sender</span>}
      </p>
    </form>
  );
}
