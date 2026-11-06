'use client';

import { useState } from 'react';
import { BottomSheet, Button, FavoriteButton, Notice, PriceSummary, useToast } from '@respin/ui';
import { SHIPPING_PRICE_ORE, computeOrderAmounts } from '@respin/core/fees';
import { formatOre, fromKr } from '@respin/core/money';
import { buyerTotal, formatKr } from '@respin/ui/utils';
import { useFavorites } from '../../lib/favorites';

export interface ItemActionsProps {
  id: string;
  title: string;
  meta: string;
  price: number;
  parcel: 'small' | 'medium';
  favorites: number;
  sellerName: string;
  sellerCertified: boolean;
}

const PARCEL_LABEL = { small: 'Lille pakke', medium: 'Mellem pakke' } as const;

/**
 * Køb, bud, besked og favorit. Testversionen kan ikke handle – men "Køb nu" viser præcis,
 * hvad købet ville koste (samme beregning som checkout), så prisen er gennemskuelig.
 */
export function ItemActions({ id, title, meta, price, parcel, favorites, sellerName, sellerCertified }: ItemActionsProps) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const fav = useFavorites();
  const on = fav.has(id);
  const a = computeOrderAmounts({ price: fromKr(price), shipping: SHIPPING_PRICE_ORE[parcel], sellerCertified });
  const notYet = () => toast('Bud og beskeder åbner, når appen er klar', { icon: 'info', duration: 3200 });

  return (
    <>
      <div className="grid gap-3">
        <Button full size="lg" variant="buy" onClick={() => setOpen(true)} aria-haspopup="dialog">Køb nu</Button>
        <div className="grid grid-cols-2 gap-3">
          <Button full variant="outline" onClick={notYet}>Giv et bud</Button>
          <Button full variant="outline" icon="chat" onClick={notYet}>Send besked</Button>
        </div>
        <div className="flex items-center gap-2 text-small text-muted">
          <FavoriteButton glass={false} pressed={on} onPressedChange={(next) => { fav.set(id, next); toast(next ? 'Gemt i dine favoritter' : 'Fjernet fra dine favoritter', { icon: 'heart' }); }} />
          <span>{(favorites + (on ? 1 : 0)).toLocaleString('da-DK')} har gemt varen</span>
        </div>
      </div>

      {/* Mobil/tablet: fast købsbjælke i bunden, så pris og køb altid er inden for rækkevidde */}
      <div className="rs-buybar fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 px-4 pt-3 backdrop-blur lg:hidden" style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}>
        <div className="mx-auto flex max-w-7xl items-center gap-4">
          <div className="min-w-0 flex-1">
            <p className="text-body font-extrabold">{formatKr(price)}</p>
            <p className="truncate text-caption text-forest">{formatKr(buyerTotal(price))} inkl. køberbeskyttelse</p>
          </div>
          <Button variant="buy" onClick={() => setOpen(true)} aria-haspopup="dialog" className="shrink-0">Køb nu</Button>
        </div>
      </div>

      <BottomSheet
        placement="viewport"
        open={open}
        onClose={() => setOpen(false)}
        title="Det betaler du"
        footer={<Button full size="lg" variant="buy" onClick={() => { setOpen(false); toast('Testversion – intet er købt', { icon: 'info' }); }}>Til betaling</Button>}
      >
        <div className="flex flex-col gap-4">
          <div>
            <p className="font-semibold">{title}</p>
            <p className="text-small text-muted">{meta}</p>
          </div>
          <PriceSummary
            rows={[
              ['Varens pris', formatOre(a.price)],
              ['Køberbeskyttelse (5 % + 3 kr.)', formatOre(a.buyerFee)],
              [`Fragt (${PARCEL_LABEL[parcel].toLowerCase()}, pakkeshop)`, formatOre(a.shipping)]
            ]}
            total={['I alt', formatOre(a.buyerTotal)]}
          />
          <Notice icon="shield">
            Vi holder pengene, til du har modtaget varen. {sellerName} får {formatOre(a.sellerPayout)} udbetalt
            ({sellerCertified ? '0,5' : '1'}&nbsp;% går til re:spin).
          </Notice>
          <Notice icon="info" warn>Testversion: du kan ikke købe endnu.</Notice>
        </div>
      </BottomSheet>
    </>
  );
}
