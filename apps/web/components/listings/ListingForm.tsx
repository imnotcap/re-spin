'use client';

import { startTransition, useActionState, useEffect, useRef, useState, type FormEvent } from 'react';
import { Button, Field, Icon, Notice, OptionCard, Select, Textarea } from '@respin/ui';
import { SHIPPING_PRICE_ORE, sellerPayout } from '@respin/core/fees';
import { formatOre, ore } from '@respin/core/money';
import { CATEGORIES, CONDITION_HELP } from '../../lib/categories';
import { CONDITION_CODES, CONDITION_LABEL, parseKr, subsOf } from '../../lib/listing-labels';
import { createListingAction, updateListingAction, type ListingFormState } from '../../lib/listing-actions';

export interface ListingFormValues {
  id?: string; title: string; description: string; category: string; subcategory: string; brand: string; size: string;
  condition: string; price: string; shippingSize: 'small' | 'medium';
}
const EMPTY: ListingFormValues = { title: '', description: '', category: '', subcategory: '', brand: '', size: '', condition: '', price: '', shippingSize: 'small' };

type Photo = { local: string; state: 'uploading' | 'done' | 'error'; id?: string; error?: string };
const MAX_PHOTOS = 8;
const MAX_EDGE = 2000;

/** Gør billedet mindre i browseren (telefonfotos er ofte 5–12 MB); serveren omkoder alligevel bagefter */
async function shrink(file: File): Promise<Blob> {
  try {
    const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' });
    const scale = Math.min(1, MAX_EDGE / Math.max(bmp.width, bmp.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bmp.width * scale); canvas.height = Math.round(bmp.height * scale);
    canvas.getContext('2d')!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    bmp.close();
    const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/jpeg', 0.88));
    return blob ?? file;
  } catch {
    return file;
  }
}

async function upload(blob: Blob): Promise<{ id: string } | { error: string }> {
  try {
    const res = await fetch('/api/billeder/', { method: 'POST', body: blob, headers: { 'Content-Type': blob.type || 'application/octet-stream' }, credentials: 'same-origin' });
    const body = (await res.json().catch(() => ({}))) as { id?: string; error?: string };
    return res.ok && body.id ? { id: body.id } : { error: body.error ?? 'Upload fejlede.' };
  } catch {
    return { error: 'Ingen forbindelse. Prøv igen.' };
  }
}

function Photos({ photos, setPhotos }: { photos: Photo[]; setPhotos: (fn: (p: Photo[]) => Photo[]) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const add = async (files: FileList | null) => {
    if (!files) return;
    const room = MAX_PHOTOS - photos.length;
    for (const file of Array.from(files).slice(0, room)) {
      const local = URL.createObjectURL(file);
      setPhotos((p) => [...p, { local, state: 'uploading' }]);
      const r = await upload(await shrink(file));
      setPhotos((p) => p.map((x) => (x.local === local ? ('id' in r ? { ...x, state: 'done', id: r.id } : { ...x, state: 'error', error: r.error }) : x)));
    }
    if (input.current) input.current.value = '';
  };
  const remove = (local: string) => setPhotos((p) => { URL.revokeObjectURL(local); return p.filter((x) => x.local !== local); });
  const cover = (local: string) => setPhotos((p) => [...p.filter((x) => x.local === local), ...p.filter((x) => x.local !== local)]);

  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="text-h3">Billeder</legend>
      <p className="text-small text-muted">1–8 billeder. Det første er forsidebilledet. Vis gerne mærke, detaljer og evt. slid.</p>
      <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4" aria-label="Valgte billeder">
        {photos.map((p, i) => (
          <li key={p.local} className="relative aspect-square overflow-hidden rounded-md border border-line bg-stone-50">
            <img src={p.local} alt={`Billede ${i + 1}`} className={`h-full w-full object-cover ${p.state === 'uploading' ? 'opacity-50' : ''}`} />
            {i === 0 && p.state === 'done' && <span className="absolute left-1 top-1 rounded-sm bg-ink px-1.5 py-0.5 text-caption font-semibold text-white">Forside</span>}
            {p.state === 'uploading' && <span className="absolute inset-x-0 bottom-0 bg-white/90 py-1 text-center text-caption" role="status">Uploader…</span>}
            {p.state === 'error' && <span className="absolute inset-x-0 bottom-0 bg-red-50 px-1 py-1 text-center text-caption text-red-800" role="alert">{p.error}</span>}
            <div className="absolute right-1 top-1 flex gap-1">
              {i > 0 && p.state === 'done' && (
                <button type="button" onClick={() => cover(p.local)} className="rounded-sm bg-white/95 px-1.5 py-0.5 text-caption font-semibold shadow-sm" aria-label={`Gør billede ${i + 1} til forsidebillede`}>Forside</button>
              )}
              <button type="button" onClick={() => remove(p.local)} className="grid h-7 w-7 place-items-center rounded-sm bg-white/95 shadow-sm" aria-label={`Fjern billede ${i + 1}`}>
                <Icon name="close" size={16} />
              </button>
            </div>
          </li>
        ))}
        {photos.length < MAX_PHOTOS && (
          <li>
            <button type="button" onClick={() => input.current?.click()} className="flex aspect-square w-full flex-col items-center justify-center gap-1 rounded-md border-2 border-dashed border-line text-small font-semibold text-forest hover:border-forest">
              <Icon name="camera" size={24} />Tilføj billeder
            </button>
          </li>
        )}
      </ul>
      <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" multiple className="sr-only" tabIndex={-1} aria-hidden="true" onChange={(e) => add(e.target.files)} />
      {photos.filter((p) => p.state === 'done').map((p) => <input key={p.id} type="hidden" name="image" value={p.id} />)}
    </fieldset>
  );
}

export function ListingForm({ initial, certified = false }: { initial?: ListingFormValues; certified?: boolean }) {
  const editing = !!initial?.id;
  const v = initial ?? EMPTY;
  const [state, action, pending] = useActionState<ListingFormState, FormData>(editing ? updateListingAction : createListingAction, undefined);
  const [category, setCategory] = useState(v.category);
  const [price, setPrice] = useState(v.price);
  const [photos, setPhotos] = useState<Photo[]>([]);
  /** Felter rettet siden sidste forsøg – deres fejl skjules, så hjælpeteksten (fx udbetalingen) kommer tilbage */
  const [edited, setEdited] = useState<ReadonlySet<string>>(new Set());
  const errorRef = useRef<HTMLDivElement>(null);
  useEffect(() => { setEdited(new Set()); if (state?.error) errorRef.current?.focus(); }, [state]);

  const priceOre = parseKr(price);
  const payout = priceOre && priceOre >= 100 ? formatOre(sellerPayout(ore(priceOre), certified)) : null;
  const uploading = photos.some((p) => p.state === 'uploading');
  const err = (f: string) => (state?.field === f && !edited.has(f) ? state.error : undefined);
  const onEdit = (e: FormEvent<HTMLFormElement>) => {
    const name = (e.target as HTMLInputElement).name;
    const f = name === 'price' ? 'priceOre' : name;
    if (state?.field === f && !edited.has(f)) setEdited(new Set(edited).add(f));
  };

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(() => action(fd)); // uden automatisk nulstilling af formularen ved fejl
  };

  return (
    <form onSubmit={submit} onInput={onEdit} onChange={onEdit} className="flex flex-col gap-6" noValidate>
      <div ref={errorRef} tabIndex={-1} className="outline-none">
        {state?.error && <Notice icon="info" warn role="alert" data-testid="form-error">{state.error}</Notice>}
      </div>
      {editing ? <input type="hidden" name="id" value={v.id} /> : <Photos photos={photos} setPhotos={setPhotos} />}

      <fieldset className="flex flex-col gap-4">
        <legend className="text-h3">Om varen</legend>
        <Field label="Titel" name="title" required minLength={3} maxLength={80} defaultValue={v.title} error={err('title')} hint="Fx “Ganni uldjakke, sort”" />
        <div className="grid gap-4 sm:grid-cols-2">
          <Select label="Kategori" name="category" required value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Vælg kategori"
            options={CATEGORIES.map((c) => ({ value: c.slug, label: c.label }))} error={err('category')} />
          <Select key={category} label="Type" name="subcategory" optional defaultValue={category === v.category ? v.subcategory : ''} emptyOption="Vælg type"
            options={[...subsOf(category)]} disabled={!category} error={err('subcategory')} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Mærke" name="brand" optional maxLength={60} defaultValue={v.brand} error={err('brand')} />
          <Field label="Størrelse" name="size" optional maxLength={20} defaultValue={v.size} error={err('size')} hint="Fx M, 38 eller 104 cm" />
        </div>
        <Textarea label="Beskrivelse" name="description" optional rows={5} maxLength={2000} defaultValue={v.description} error={err('description')}
          hint="Mål, materiale, pasform og evt. fejl. Del ikke telefonnummer eller betaling uden om re:spin – så mister du køberbeskyttelsen." />
      </fieldset>

      <fieldset className="flex flex-col gap-2">
        <legend className="text-h3">Stand</legend>
        {err('condition') && <p className="text-small text-red-700" role="alert">{err('condition')}</p>}
        {CONDITION_CODES.map((c) => (
          <OptionCard key={c} name="condition" value={c} required title={CONDITION_LABEL[c]} description={CONDITION_HELP[CONDITION_LABEL[c]]} defaultChecked={v.condition === c} />
        ))}
      </fieldset>

      <fieldset className="flex flex-col gap-4">
        <legend className="text-h3">Pris og fragt</legend>
        <Field label="Pris" name="price" inputMode="decimal" required suffix="kr." value={price} onChange={(e) => setPrice(e.target.value)} error={err('priceOre')}
          hint={payout ? `Du får ${payout} udbetalt (${certified ? '0,5' : '1'} % i gebyr). Køberen betaler køberbeskyttelse og fragt.` : 'Mellem 1 og 100.000 kr.'} />
        <div className="flex flex-col gap-2" role="radiogroup" aria-label="Pakkestørrelse">
          <OptionCard name="shippingSize" value="small" title="Lille pakke" description="Op til 2 kg – fx tøj og tasker" right={formatOre(SHIPPING_PRICE_ORE.small)} defaultChecked={v.shippingSize === 'small'} />
          <OptionCard name="shippingSize" value="medium" title="Mellem pakke" description="Op til 5 kg – fx sko, støvler og ting til hjemmet" right={formatOre(SHIPPING_PRICE_ORE.medium)} defaultChecked={v.shippingSize === 'medium'} />
        </div>
      </fieldset>

      <Button type="submit" size="lg" full disabled={pending || uploading}>
        {uploading ? 'Venter på billeder…' : pending ? 'Gemmer…' : editing ? 'Gem ændringer' : 'Sæt til salg'}
      </Button>
    </form>
  );
}
