'use client';

import { m } from 'motion/react';
import { Badge, Icon, ProductImage } from '@respin/ui';

const ITEMS = [
  { title: 'Ganni uldjakke', meta: 'Ganni · M', price: '450 kr.', badge: 'Næsten ny', shade: 0 },
  { title: 'Adidas Samba', meta: 'Adidas · 41', price: '350 kr.', badge: undefined, shade: 1 },
  { title: 'Ruskindstaske', meta: 'Vintage', price: '320 kr.', badge: 'Vintage', shade: 2 },
  { title: 'Levi’s 501', meta: 'Levi’s · W30', price: '280 kr.', badge: undefined, shade: 3 }
];

/** Dekorativ telefon med app-forhåndsvisning. Ingen links/knapper (skjult for skærmlæsere, så intet fokuserbart). */
export function HeroPhone() {
  return (
    <div aria-hidden="true" className="relative mx-auto w-full max-w-[320px] select-none">
      <m.div
        initial={{ y: 0 }}
        animate={{ y: [0, -10, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        className="overflow-hidden rounded-[40px] border-[10px] border-slate bg-canvas shadow-float"
      >
        <div className="flex items-center gap-2 px-4 pb-2 pt-4">
          <div className="flex h-10 flex-1 items-center gap-2 rounded-md bg-sunken px-3 text-small text-muted"><Icon name="search" size={18} /> Søg efter tøj, brands…</div>
          <Icon name="heart" size={22} />
        </div>
        <div className="mx-3 mt-1 rounded-lg bg-grad-lime p-4">
          <p className="text-h3 leading-[22px]">Giv tøjet nyt liv.</p>
          <p className="mt-1 text-caption text-slate-700">Sælg nemt, køb unikt.</p>
        </div>
        <div className="grid grid-cols-2 gap-3 p-3">
          {ITEMS.map((it) => (
            <div key={it.title}>
              <div className="relative overflow-hidden rounded-md">
                <ProductImage alt="" shade={it.shade} />
                {it.badge && <Badge className="absolute bottom-2 left-2">{it.badge}</Badge>}
              </div>
              <p className="mt-1.5 truncate text-[13px] font-semibold">{it.title}</p>
              <p className="truncate text-[11px] text-muted">{it.meta}</p>
              <p className="text-[13px] font-extrabold">{it.price}</p>
            </div>
          ))}
        </div>
      </m.div>
    </div>
  );
}
