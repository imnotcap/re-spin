'use client';

import { startTransition, useActionState, useState, type FormEvent } from 'react';
import { Button, Field, Notice, OptionCard, Select, Textarea } from '@respin/ui';
import { createCaseAction, type SupportFormState } from '../../lib/support-actions';

const CATEGORIES = [
  { id: 'order', title: 'Ordre og levering', description: 'Pakken er ikke kommet, er forkert eller beskadiget' },
  { id: 'payment', title: 'Betaling og refundering', description: 'Betaling, gebyrer eller penge tilbage' },
  { id: 'account', title: 'Konto og login', description: 'Login, e-mail, passkey eller sletning' },
  { id: 'listing', title: 'Annonce', description: 'Din annonce er fjernet eller venter på gennemgang' },
  { id: 'safety', title: 'Svindel og sikkerhed', description: 'Mistænkelige beskeder, betaling uden om Videro' },
  { id: 'other', title: 'Andet', description: 'Alt det andet' }
] as const;

export function NewCaseForm({ orders }: { orders: { id: string; label: string }[] }) {
  const [state, action, pending] = useActionState<SupportFormState, FormData>(createCaseAction, undefined);
  const [len, setLen] = useState(0);
  const err = (f: string) => (state?.field === f ? state.error : undefined);
  const submit = (e: FormEvent<HTMLFormElement>) => { e.preventDefault(); const fd = new FormData(e.currentTarget); startTransition(() => action(fd)); };
  return (
    <form onSubmit={submit} className="flex flex-col gap-5" noValidate>
      {state?.error && !state.field && <Notice icon="info" warn role="alert">{state.error}</Notice>}
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-body font-semibold">Hvad drejer det sig om?</legend>
        {err('category') && <p role="alert" className="text-small text-red-700">{err('category')}</p>}
        <div className="grid gap-2 sm:grid-cols-2">
          {CATEGORIES.map((c, i) => <OptionCard key={c.id} name="category" value={c.id} title={c.title} description={c.description} defaultChecked={i === 0} required />)}
        </div>
      </fieldset>
      {orders.length > 0 && (
        <Select label="Ordre" name="orderId" optional emptyOption="Ingen bestemt ordre" options={orders.map((o) => ({ value: o.id, label: o.label }))} error={err('orderId')} />
      )}
      <Field label="Overskrift" name="subject" required minLength={3} maxLength={120} placeholder="Fx: Pakken er ikke kommet" error={err('subject')} />
      <Textarea label="Beskrivelse" name="message" required rows={6} maxLength={4000} onChange={(e) => setLen(e.target.value.length)}
        hint={`Fortæl, hvad der er sket, og hvad du har brug for. Del aldrig adgangskoder eller kortnumre. ${len}/4.000`} error={err('message')} />
      <div><Button type="submit" size="lg" disabled={pending}>{pending ? 'Sender…' : 'Send til kundeservice'}</Button></div>
    </form>
  );
}
