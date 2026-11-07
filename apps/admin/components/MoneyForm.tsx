'use client';

import { startTransition, useActionState, type FormEvent } from 'react';
import { moneyAction, type ActionState } from '../lib/actions';

/** Refundering/tvistafgørelse med begrundelse. Bekræftes, før den sendes. */
export function MoneyForm({ orderId, actions, needsApproval }: { orderId: string; actions: Array<{ id: string; label: string }>; needsApproval: boolean }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(moneyAction, undefined);
  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const label = actions.find((a) => a.id === fd.get('action'))?.label ?? 'handlingen';
    if (!window.confirm(`${label}?${needsApproval ? '\n\nBeløbet kræver en kollegas godkendelse, før pengene flyttes.' : '\n\nPengene flyttes med det samme og kan ikke trækkes tilbage.'}`)) return;
    startTransition(() => action(fd));
  };
  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <input type="hidden" name="orderId" value={orderId} />
      <fieldset className="flex flex-col gap-1.5">
        <legend className="text-small font-semibold">Handling</legend>
        {actions.map((a, i) => (
          <label key={a.id} className="flex items-center gap-2 text-small"><input type="radio" name="action" value={a.id} defaultChecked={i === 0} required />{a.label}</label>
        ))}
      </fieldset>
      <label className="text-small font-semibold">Begrundelse <span className="font-normal text-muted">(gemmes på ordren og i audit-loggen)</span>
        <textarea name="reason" required minLength={5} maxLength={500} rows={3} className="mt-1 block w-full rounded-md border border-line px-3 py-2 text-small" placeholder="Fx: Varen kom aldrig frem – sporing viser ingen aflevering" />
      </label>
      {needsApproval && <p className="text-caption text-muted">Fra 1.000 kr. skal en anden medarbejder godkende (fire-øjne).</p>}
      {state?.error && <p role="alert" className="text-small text-red-700">{state.error}</p>}
      <button disabled={pending} className="h-10 rounded-md bg-coral-600 px-4 text-small font-semibold text-white disabled:opacity-60">{pending ? 'Arbejder…' : needsApproval ? 'Send til godkendelse' : 'Udfør'}</button>
    </form>
  );
}
