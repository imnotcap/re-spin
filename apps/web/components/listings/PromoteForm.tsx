'use client';

import { startTransition, useActionState, useEffect, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Checkbox, Notice, OptionCard } from '@respin/ui';
import { formatOre, ore } from '@respin/core/money';
import { promotionPackages, promotionPrice, type PromotionKind } from '@respin/core/promotions';
import { promoteAction, type PromoteState } from '../../lib/promotion-actions';

const WHAT: Record<PromotionKind, string> = {
  listing: 'Øverst i feed og kategori med mærket «Fremhævet»',
  profile: 'Vist under «Fremhævede sælgere» på forsiden'
};

/**
 * Vælg pakke → betal hos Stripe (eller aktivér med det samme i testtilstand). Priserne vises her, men serveren
 * vælger altid selv prisen ud fra pakken og om sælgeren er certificeret.
 */
export function PromoteForm({ kind = 'listing', listingId, certified, testMode }: { kind?: PromotionKind; listingId?: string; certified: boolean; testMode: boolean }) {
  const [state, action, pending] = useActionState<PromoteState, FormData>(promoteAction, undefined);
  const router = useRouter();
  const done = kind === 'profile' ? '/konto/?profil_fremhaevet=1' : '/konto/annoncer/?fremhaevet=1';
  useEffect(() => {
    if (state?.checkoutUrl && /^https:\/\/checkout\.stripe\.com\//.test(state.checkoutUrl)) window.location.assign(state.checkoutUrl);
    else if (state?.activated) router.push(done);
  }, [state, router, done]);
  const submit = (e: FormEvent<HTMLFormElement>) => { e.preventDefault(); const fd = new FormData(e.currentTarget); startTransition(() => action(fd)); };
  const busy = pending || !!state?.checkoutUrl || !!state?.activated;
  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <input type="hidden" name="kind" value={kind} />
      {listingId && <input type="hidden" name="listingId" value={listingId} />}
      {state?.error && <Notice icon="info" warn role="alert">{state.error}</Notice>}
      {certified && <Notice icon="check">Du er certificeret sælger og får fremhævning til nedsat pris.</Notice>}
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-h3">Vælg periode</legend>
        {promotionPackages(kind).map((p) => (
          <OptionCard key={p.id} name="package" value={p.id} defaultChecked={!!p.popular} required
            title={`${p.label}${p.popular ? ' · mest valgt' : ''}`}
            description={`${WHAT[kind]} i ${p.days === 1 ? '24 timer' : `${p.days} dage`}`}
            right={certified
              ? <span className="text-right"><s className="block text-caption font-normal text-muted">{formatOre(ore(p.priceOre))}</s>{formatOre(ore(promotionPrice(p, true)))}</span>
              : formatOre(ore(p.priceOre))} />
        ))}
      </fieldset>
      <p className="text-small text-muted">Perioden starter, når betalingen er gennemført. Kører der allerede en fremhævning, lægges den nye i forlængelse. Priserne er inkl. moms.</p>
      <Checkbox name="consent" value="yes" required>
        Jeg ønsker, at fremhævningen starter med det samme, og er indforstået med, at jeg mister min fortrydelsesret, når ydelsen er leveret. Se <a href="/vilkaar/#fremhaevning" target="_blank" className="font-semibold underline underline-offset-2">vilkårene</a>.
      </Checkbox>
      {testMode && <Notice icon="info" warn>Testtilstand: der trækkes ingen penge, og fremhævningen starter med det samme.</Notice>}
      <div><Button type="submit" size="lg" disabled={busy}>{busy ? 'Sender videre…' : testMode ? 'Fremhæv (test)' : 'Gå til betaling'}</Button></div>
    </form>
  );
}
