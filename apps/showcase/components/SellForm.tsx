'use client';

import { useState } from 'react';
import { Button, Chip, Field, Notice, OptionCard, Progress, ScreenContent, ScreenFooter, Select, Textarea, Toggle, useToast } from '@respin/ui';
import { buyerFee, formatKr, formatKrDecimals, sellerPayout } from '@respin/ui/utils';

export function SellForm({ certified = false }: { certified?: boolean }) {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [condition, setCondition] = useState('');
  const [price, setPrice] = useState('');
  const { toast } = useToast();
  const p = Number(price) || 0;
  const done = [title.trim().length > 2, !!category, !!condition, p > 0].filter(Boolean).length;
  const total = 4;
  return (
    <>
      <ScreenContent withFooter>
        <div style={{ padding: '0 16px' }}>
          <div className="rs-row-flex" style={{ justifyContent: 'space-between' }}>
            <span className="rs-t-small rs-t-bold">{done} af {total} udfyldt</span>
            <span className="rs-t-small rs-t-muted">Gratis at oprette</span>
          </div>
          <Progress value={(done / total) * 100} aria-label="Fremdrift" className="rs-mt-2" />
          <form className="rs-form-stack rs-mt-6" onSubmit={(e) => e.preventDefault()} noValidate>
            <label className="rs-optcard" style={{ cursor: 'pointer' }}>
              <span className="rs-grow"><b className="rs-t-bold" style={{ display: 'block' }}>AI-baggrundsfjerner</b><span className="rs-t-small rs-t-muted">Få rene produktbilleder</span></span>
              <Toggle label="Fjern baggrund" defaultChecked />
            </label>
            <Field label="Titel" placeholder="fx Ganni uldjakke, str. M" hint="Skriv brand, type og størrelse" value={title} onChange={(e) => setTitle(e.target.value)} />
            <Textarea label="Beskrivelse" placeholder="Fortæl om stand, pasform og evt. fejl…" optional />
            <Select label="Kategori" options={['Vintage', 'Gade-stil', 'Sneakers', 'Tasker']} value={category} onChange={(e) => setCategory(e.target.value)} />
            <div className="rs-stack rs-gap-2">
              <span className="rs-field__label">Stand</span>
              <div className="rs-row-flex rs-gap-2" style={{ flexWrap: 'wrap' }}>
                {['Ny med mærke', 'Som ny', 'Næsten ny', 'God men brugt'].map((c) => <Chip key={c} pressed={condition === c} onClick={() => setCondition(c)}>{c}</Chip>)}
              </div>
            </div>
            <Field label="Din pris" suffix="kr." inputMode="numeric" placeholder="0" value={price} onChange={(e) => setPrice(e.target.value.replace(/\D/g, ''))} />
            <Notice icon="wallet">
              {p ? (<><b>Du får hele beløbet: {formatKrDecimals(sellerPayout(p, certified))}</b> – 0 % i kommission.<br />Køber betaler {formatKr(p + buyerFee(p))} inkl. køberbeskyttelse.</>) : 'Sæt en pris, så viser vi hvad du får udbetalt.'}
            </Notice>
            <div className="rs-stack rs-gap-3">
              <OptionCard name="ship" value="s" title="Lille pakke" description="Op til 2 kg · fra 39 kr." icon="package" defaultChecked />
              <OptionCard name="ship" value="m" title="Medium pakke" description="Op til 5 kg · fra 49 kr." icon="truck" />
            </div>
          </form>
        </div>
      </ScreenContent>
      <ScreenFooter>
        <Button size="lg" full disabled={done < total} onClick={() => toast('Din annonce er live')}>Sæt til salg</Button>
      </ScreenFooter>
    </>
  );
}
