'use client';

import { useState } from 'react';
import { Button, Field } from '@respin/ui';

interface Point { id: string; name: string; address: string; zipcode: string; city: string; distanceM: number | null }

/**
 * Vælg pakkeshop i købsvinduet: skriv postnummer → nærmeste pakkeshops fra fragtfirmaet. Kun id og postnummer
 * sendes med købet; serveren slår pakkeshoppen op igen, så den ikke kan forfalskes.
 * `formId`: felterne står i vinduet, men hører til købsformularen i bunden (HTML-attributten form).
 */
export function PickupPointPicker({ formId, onChange }: { formId: string; onChange: (chosen: boolean) => void }) {
  const [zip, setZip] = useState('');
  const [points, setPoints] = useState<Point[] | null>(null);
  const [chosen, setChosen] = useState('');
  const [state, setState] = useState<'idle' | 'loading' | 'error'>('idle');

  const search = async () => {
    if (!/^\d{4}$/.test(zip)) { setState('error'); setPoints(null); return; }
    setState('loading');
    try {
      const r = await fetch(`/api/pakkeshops/?postnr=${zip}`, { credentials: 'same-origin' });
      const d = (await r.json()) as { points?: Point[] };
      setPoints(d.points ?? []); setChosen(''); onChange(false); setState(r.ok ? 'idle' : 'error');
    } catch { setState('error'); }
  };

  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="mb-1 font-semibold">Levering til pakkeshop</legend>
      <div className="flex items-end gap-2">
        <Field label="Dit postnummer" name="servicePointZip" form={formId} inputMode="numeric" autoComplete="postal-code" maxLength={4} value={zip}
          onChange={(e) => setZip(e.target.value.replace(/\D/g, '').slice(0, 4))}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void search(); } }} className="flex-1" />
        <Button type="button" variant="outline" onClick={() => void search()} disabled={state === 'loading'}>{state === 'loading' ? 'Søger…' : 'Find pakkeshops'}</Button>
      </div>
      {state === 'error' && <p role="alert" className="text-small text-red-700">{/^\d{4}$/.test(zip) ? 'Pakkeshops kunne ikke hentes. Prøv igen om lidt.' : 'Skriv et postnummer med 4 cifre.'}</p>}
      {points && points.length === 0 && state !== 'error' && <p className="text-small text-muted">Ingen pakkeshops fundet ved {zip}.</p>}
      {points && points.length > 0 && (
        <div role="radiogroup" aria-label="Pakkeshops" className="flex max-h-64 flex-col gap-2 overflow-y-auto">
          {points.map((p) => (
            <label key={p.id} className={`flex cursor-pointer items-start gap-3 rounded-md border p-3 text-small ${chosen === p.id ? 'border-forest bg-forest-50' : 'border-line'}`}>
              <input type="radio" form={formId} name="servicePointId" value={p.id} checked={chosen === p.id} required className="mt-1"
                onChange={() => { setChosen(p.id); onChange(true); }} />
              <span className="min-w-0 flex-1">
                <b className="block">{p.name}</b>
                <span className="text-muted">{p.address}, {p.zipcode} {p.city}{p.distanceM != null ? ` · ${p.distanceM < 1000 ? `${Math.round(p.distanceM)} m` : `${(p.distanceM / 1000).toFixed(1).replace('.', ',')} km`}` : ''}</span>
              </span>
            </label>
          ))}
        </div>
      )}
    </fieldset>
  );
}
