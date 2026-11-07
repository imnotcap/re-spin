'use client';

import { startTransition, useActionState, useEffect, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Notice, OptionCard } from '@respin/ui';
import { formatOre, ore } from '@respin/core/money';
import { PROMOTION_PACKAGES } from '../../lib/promotion-packages';
import { promoteAction, type PromoteState } from '../../lib/promotion-actions';

/** Vælg pakke → betal hos Stripe (eller aktivér med det samme i testtilstand) */
export function PromoteForm({ listingId, testMode }: { listingId: string; testMode: boolean }) {
  const [state, action, pending] = useActionState<PromoteState, FormData>(promoteAction, undefined);
  const router = useRouter();
  useEffect(() => {
    if (state?.checkoutUrl && /^https:\/\/checkout\.stripe\.com\//.test(state.checkoutUrl)) window.location.assign(state.checkoutUrl);
    else if (state?.activated) router.push('/konto/annoncer/?fremhaevet=1');
  }, [state, router]);
  const submit = (e: FormEvent<HTMLFormElement>) => { e.preventDefault(); const fd = new FormData(e.currentTarget); startTransition(() => action(fd)); };
  const busy = pending || !!state?.checkoutUrl || !!state?.activated;
  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <input type="hidden" name="listingId" value={listingId} />
      {state?.error && <Notice icon="info" warn role="alert">{state.error}</Notice>}
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-h3">Vælg periode</legend>
        {PROMOTION_PACKAGES.map((p) => (
          <OptionCard key={p.id} name="package" value={p.id} defaultChecked={!!p.popular} required
            title={`${p.label}${p.popular ? ' · mest valgt' : ''}`}
            description={`Øverst i feed og kategori med mærket «Fremhævet» i ${p.days === 1 ? '24 timer' : `${p.days} dage`}`}
            right={formatOre(ore(p.priceOre))} />
        ))}
      </fieldset>
      <p className="text-small text-muted">Perioden starter, når betalingen er gennemført. Kører der allerede en fremhævning, lægges den nye i forlængelse. Når perioden er startet, refunderes den ikke.</p>
      {testMode && <Notice icon="info" warn>Testtilstand: der trækkes ingen penge, og fremhævningen starter med det samme.</Notice>}
      <div><Button type="submit" size="lg" disabled={busy}>{busy ? 'Sender videre…' : testMode ? 'Fremhæv (test)' : 'Gå til betaling'}</Button></div>
    </form>
  );
}
