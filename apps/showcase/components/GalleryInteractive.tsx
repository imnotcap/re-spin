'use client';

import { useState } from 'react';
import { BottomSheet, Button, Checkbox, Chip, Field, OptionCard, Select, Tabs, Textarea, Toggle, useToast } from '@respin/ui';

export function GalleryInteractive() {
  const [tab, setTab] = useState('buy');
  const [under, setUnder] = useState('items');
  const [chip, setChip] = useState(true);
  const [sheet, setSheet] = useState(false);
  const { toast } = useToast();
  return (
    <div className="g-col">
      <Tabs variant="segmented" value={tab} onValueChange={setTab} items={[{ value: 'buy', label: 'Køb' }, { value: 'sell', label: 'Salg' }]} />
      <Tabs value={under} onValueChange={setUnder} items={[{ value: 'items', label: 'Annoncer' }, { value: 'reviews', label: 'Anmeldelser' }]} />
      <div className="rs-row-flex rs-gap-2" style={{ flexWrap: 'wrap' }}>
        <Chip pressed={chip} onClick={() => setChip(!chip)}>Valgt</Chip>
        <Chip pressed={!chip} onClick={() => setChip(!chip)}>Ikke valgt</Chip>
        <Chip tag>Tag</Chip>
      </div>
      <Field label="Titel" placeholder="fx Ganni uldjakke" hint="Skriv brand og størrelse" />
      <Field label="E-mail" icon="mail" defaultValue="fejl" error="Ugyldig e-mail" />
      <Field label="Pris" suffix="kr." defaultValue="450" />
      <Select label="Kategori" options={['Vintage', 'Sneakers']} />
      <Textarea label="Beskrivelse" optional placeholder="Fortæl om stand…" />
      <label className="rs-row-flex" style={{ justifyContent: 'space-between' }}><b>Fjern baggrund</b><Toggle label="Fjern baggrund" defaultChecked /></label>
      <Checkbox defaultChecked>Jeg accepterer vilkår</Checkbox>
      <OptionCard name="g" value="1" title="Pakkeshop · DAO" description="2–3 dage" icon="pin" right="39 kr." defaultChecked />
      <OptionCard name="g" value="2" title="Hjemmelevering" description="2–3 dage" icon="truck" right="59 kr." />
      <div className="rs-row-flex rs-gap-3">
        <Button variant="outline" onClick={() => toast('Gemt i favoritter', { icon: 'heart' })}>Vis toast</Button>
        <Button onClick={() => setSheet(true)}>Åbn sheet</Button>
      </div>
      <div style={{ position: 'relative' }}>
        <BottomSheet open={sheet} onClose={() => setSheet(false)} title="Sortér og filtrer" footer={<Button full onClick={() => setSheet(false)}>Vis resultater</Button>}>
          <p>Sheet med fokus-fælde, Escape og tryk på baggrund.</p>
        </BottomSheet>
      </div>
    </div>
  );
}
