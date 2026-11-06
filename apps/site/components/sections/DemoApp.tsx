'use client';

/**
 * Interaktiv demo af appen (indlæses først, når sektionen nærmer sig skærmen).
 * Bygget af UI-kittets komponenter; priserne beregnes med de samme funktioner som backend (@respin/core).
 */
import { useMemo, useState } from 'react';
import { AnimatePresence, m } from 'motion/react';
import { BottomSheet, Button, Chip, FavoriteButton, Notice, PriceSummary, ProductImage, ToastProvider, useToast } from '@respin/ui';
import { computeOrderAmounts, SHIPPING_PRICE_ORE } from '@respin/core/fees';
import { formatOre, fromKr } from '@respin/core/money';

type Category = 'alle' | 'tøj' | 'sko' | 'tasker';
interface DemoItem { id: number; title: string; brand: string; size: string; priceKr: number; category: Exclude<Category, 'alle'>; condition: string }

const ITEMS: DemoItem[] = [
  { id: 1, title: 'Ganni uldjakke', brand: 'Ganni', size: 'M', priceKr: 450, category: 'tøj', condition: 'Næsten ny' },
  { id: 2, title: 'Adidas Samba OG', brand: 'Adidas', size: '41', priceKr: 350, category: 'sko', condition: 'God men brugt' },
  { id: 3, title: 'Vintage ruskindstaske', brand: 'Vintage', size: 'One size', priceKr: 320, category: 'tasker', condition: 'God men brugt' },
  { id: 4, title: 'Levi’s 501 denim', brand: 'Levi’s', size: 'W30 L32', priceKr: 280, category: 'tøj', condition: 'God men brugt' },
  { id: 5, title: 'Nike Air Max 90', brand: 'Nike', size: '43', priceKr: 520, category: 'sko', condition: 'Som ny' },
  { id: 6, title: 'Carhartt hættetrøje', brand: 'Carhartt', size: 'L', priceKr: 390, category: 'tøj', condition: 'Næsten ny' }
];
const CATEGORIES: Category[] = ['alle', 'tøj', 'sko', 'tasker'];

function Demo() {
  const [category, setCategory] = useState<Category>('alle');
  const [favs, setFavs] = useState<ReadonlySet<number>>(new Set([1]));
  const [selected, setSelected] = useState<DemoItem | null>(null);
  const { toast } = useToast();
  const visible = useMemo(() => ITEMS.filter((i) => category === 'alle' || i.category === category), [category]);
  const amounts = selected ? computeOrderAmounts({ price: fromKr(selected.priceKr), shipping: SHIPPING_PRICE_ORE.small, sellerCertified: false }) : null;

  const toggleFav = (id: number, on: boolean) => {
    setFavs((prev) => { const next = new Set(prev); if (on) next.add(id); else next.delete(id); return next; });
    toast(on ? 'Gemt i favoritter' : 'Fjernet fra favoritter', { icon: on ? 'heart' : 'close' });
  };

  return (
    <div className="relative mx-auto h-[640px] w-full max-w-[380px] overflow-hidden rounded-[40px] border-[10px] border-slate bg-canvas shadow-float">
      <div className="flex h-full flex-col">
        <div className="px-4 pb-2 pt-5">
          <p className="text-h2">Fund til dig</p>
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Kategori">
            {CATEGORIES.map((c) => (
              <Chip key={c} size="sm" pressed={category === c} onClick={() => setCategory(c)}>{c[0]!.toUpperCase() + c.slice(1)}</Chip>
            ))}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-4 pb-6">
          <ul className="grid grid-cols-2 gap-x-3 gap-y-5">
            <AnimatePresence initial={false}>
              {visible.map((it) => (
                <m.li key={it.id} initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }} transition={{ duration: 0.2 }} className="relative">
                  <button type="button" className="block w-full text-left" onClick={() => setSelected(it)} aria-haspopup="dialog">
                    <div className="overflow-hidden rounded-md"><ProductImage alt="" shade={it.id} /></div>
                    <span className="mt-1.5 block truncate text-[13px] font-semibold">{it.title}</span>
                    <span className="block truncate text-[11px] text-muted">{it.brand} · {it.size}</span>
                    <span className="block text-[14px] font-extrabold">{it.priceKr} kr.</span>
                  </button>
                  <div className="absolute right-1 top-1">
                    <FavoriteButton pressed={favs.has(it.id)} onPressedChange={(on) => toggleFav(it.id, on)} />
                  </div>
                </m.li>
              ))}
            </AnimatePresence>
          </ul>
        </div>
      </div>
      <BottomSheet open={selected !== null} onClose={() => setSelected(null)} title={selected?.title ?? ''}
        footer={<Button full size="lg" variant="buy" onClick={() => { setSelected(null); toast('Det er en demo – intet er købt', { icon: 'info' }); }}>Køb nu</Button>}>
        {selected && amounts && (
          <div className="flex flex-col gap-4">
            <p className="text-small text-muted">{selected.brand} · {selected.size} · {selected.condition}</p>
            <PriceSummary rows={[['Vare', formatOre(amounts.price)], ['Køberbeskyttelse (5 % + 3 kr.)', formatOre(amounts.buyerFee)], ['Fragt (pakkeshop)', formatOre(amounts.shipping)]]} total={['Du betaler', formatOre(amounts.buyerTotal)]} />
            <Notice icon="shield">Sælger får {formatOre(amounts.sellerPayout)}, når du har modtaget varen.</Notice>
          </div>
        )}
      </BottomSheet>
    </div>
  );
}

export default function DemoApp() {
  return <ToastProvider><Demo /></ToastProvider>;
}
