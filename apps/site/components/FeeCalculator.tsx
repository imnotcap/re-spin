'use client';

/**
 * Gebyrberegner. Bruger præcis de samme funktioner som backend (@respin/core), så tallene altid stemmer
 * med det, køber og sælger faktisk betaler/får. Beløb regnes i øre (ingen afrundingsfejl).
 */
import { useId, useState } from 'react';
import { Field, PriceSummary, Select, Toggle } from '@respin/ui';
import { computeOrderAmounts, SHIPPING_PRICE_ORE } from '@respin/core/fees';
import { formatOre, fromKr } from '@respin/core/money';
import { MAX_PRICE_ORE, MIN_PRICE_ORE } from '@respin/core/limits';

const MIN_KR = MIN_PRICE_ORE / 100;
const MAX_KR = MAX_PRICE_ORE / 100;
type Size = keyof typeof SHIPPING_PRICE_ORE;
const SIZE_LABEL: Record<Size, string> = { small: 'Lille pakke (op til 2 kg)', medium: 'Medium pakke (op til 5 kg)' };

/** Kun hele kroner. Returnerer null ved tomt/ugyldigt felt. */
export function parsePriceKr(raw: string): number | null {
  const digits = raw.replace(/[\s.]/g, '');
  if (!/^\d{1,7}$/.test(digits)) return null;
  const n = Number(digits);
  return n >= MIN_KR && n <= MAX_KR ? n : null;
}

export function FeeCalculator() {
  const [raw, setRaw] = useState('300');
  const [size, setSize] = useState<Size>('small');
  const [certified, setCertified] = useState(false);
  const toggleId = useId();
  const price = parsePriceKr(raw);
  const a = price === null ? null : computeOrderAmounts({ price: fromKr(price), shipping: SHIPPING_PRICE_ORE[size], sellerCertified: certified });
  const error = raw.trim() === '' ? 'Skriv en pris.' : price === null ? `Prisen skal være et helt beløb mellem ${MIN_KR} og ${MAX_KR.toLocaleString('da-DK')} kr.` : undefined;

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
      <form className="flex flex-col gap-5 rounded-lg border border-line bg-surface p-6 shadow-line" onSubmit={(e) => e.preventDefault()} noValidate aria-label="Beregn gebyrer">
        <Field label="Varens pris" name="price" inputMode="numeric" autoComplete="off" suffix="kr." value={raw} maxLength={9}
          onChange={(e) => setRaw(e.target.value)} error={error} hint={error ? undefined : 'Hele kroner'} />
        <Select label="Fragt" name="size" value={size} onChange={(e) => setSize(e.target.value as Size)}
          options={(Object.keys(SHIPPING_PRICE_ORE) as Size[]).map((s) => ({ value: s, label: `${SIZE_LABEL[s]} – ${formatOre(SHIPPING_PRICE_ORE[s])}` }))} />
        <div className="flex items-center justify-between gap-4">
          <label htmlFor={toggleId} className="text-body font-semibold">Certificeret sælger <span className="block text-small font-normal text-muted">0,5 % i stedet for 1 %</span></label>
          <Toggle id={toggleId} label="Certificeret sælger" checked={certified} onChange={(e) => setCertified(e.target.checked)} />
        </div>
      </form>

      <div className="flex flex-col gap-5" aria-live="polite">
        <div className="rounded-lg border border-line bg-surface p-6 shadow-line">
          <h2 className="text-h3">Køber betaler</h2>
          <div className="mt-4">
            {a ? <PriceSummary rows={[['Vare', formatOre(a.price)], ['Køberbeskyttelse (5 % + 3 kr.)', formatOre(a.buyerFee)], ['Fragt', formatOre(a.shipping)]]} total={['I alt', formatOre(a.buyerTotal)]} />
              : <p className="text-small text-muted">Skriv en gyldig pris for at se beregningen.</p>}
          </div>
        </div>
        <div className="rounded-lg bg-grad-deep p-6 text-cream">
          <h2 className="text-h3">Sælger får udbetalt</h2>
          <p className="mt-2 text-[40px] font-extrabold leading-[44px] tracking-[-0.02em] text-lime" data-testid="payout">{a ? formatOre(a.sellerPayout) : '–'}</p>
          <p className="mt-1 text-small text-cream/80">{a ? `${formatOre(a.price)} − ${formatOre(a.sellerFee)} (${certified ? '0,5' : '1'} % til re:spin)` : ' '}</p>
        </div>
      </div>
    </div>
  );
}
