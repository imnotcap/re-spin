'use client';

import { useState } from 'react';
import { BottomSheet, Button, FavoriteButton, Notice, PriceSummary, useToast } from '@respin/ui';
import { SHIPPING_PRICE_ORE, computeOrderAmounts } from '@respin/core/fees';
import { formatOre, fromKr } from '@respin/core/money';
import { buyerTotal, formatKr } from '@respin/ui/utils';
import { useFavorites } from '../../lib/favorites';
import { track } from '../../lib/analytics';
import { useI18n } from '../../lib/i18n/client';

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
  const { t, n } = useI18n();
  const notYet = () => toast(t('buy.notYet'), { icon: 'info', duration: 3200 });

  return (
    <>
      <div className="grid gap-3">
        <Button full size="lg" variant="buy" onClick={() => setOpen(true)} aria-haspopup="dialog" data-track="buy_now" data-listing={id}>{t('buy.now')}</Button>
        <div className="grid grid-cols-2 gap-3">
          <Button full variant="outline" onClick={notYet} data-track="offer" data-listing={id}>{t('buy.offer')}</Button>
          <Button full variant="outline" icon="chat" onClick={notYet} data-track="message" data-listing={id}>{t('buy.message')}</Button>
        </div>
        <div className="flex items-center gap-2 text-small text-muted">
          <FavoriteButton glass={false} pressed={on} onPressedChange={(next) => { fav.set(id, next); track('favorite', { listingId: id, num: next ? 1 : -1 }); toast(next ? t('fav.saved') : t('fav.removed'), { icon: 'heart' }); }} />
          <span>{t('buy.savedBy', { n: n(favorites + (on ? 1 : 0)) })}</span>
        </div>
      </div>

      {/* Mobil/tablet: fast købsbjælke i bunden, så pris og køb altid er inden for rækkevidde */}
      <div className="rs-buybar fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 px-4 pt-3 backdrop-blur lg:hidden" style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}>
        <div className="mx-auto flex max-w-7xl items-center gap-4">
          <div className="min-w-0 flex-1">
            <p className="text-body font-extrabold">{formatKr(price)}</p>
            <p className="truncate text-caption text-forest">{t('buy.inclProtection', { price: formatKr(buyerTotal(price)) })}</p>
          </div>
          <Button variant="buy" onClick={() => setOpen(true)} aria-haspopup="dialog" className="shrink-0">{t('buy.now')}</Button>
        </div>
      </div>

      <BottomSheet
        placement="viewport"
        open={open}
        onClose={() => setOpen(false)}
        title={t('buy.title')}
        footer={<Button full size="lg" variant="buy" onClick={() => { setOpen(false); toast(t('buy.testDone'), { icon: 'info' }); }}>{t('buy.toPayment')}</Button>}
      >
        <div className="flex flex-col gap-4">
          <div>
            <p className="font-semibold">{title}</p>
            <p className="text-small text-muted">{meta}</p>
          </div>
          <PriceSummary
            rows={[
              [t('buy.itemPrice'), formatOre(a.price)],
              [t('buy.fee'), formatOre(a.buyerFee)],
              [t('buy.shipping', { parcel: t(`buy.parcel.${parcel}`) }), formatOre(a.shipping)]
            ]}
            total={[t('buy.total'), formatOre(a.buyerTotal)]}
          />
          <Notice icon="shield">
            {t('buy.held', { seller: sellerName, payout: formatOre(a.sellerPayout), pct: n(sellerCertified ? 0.5 : 1) })}
          </Notice>
          <Notice icon="info" warn>{t('buy.testNotice')}</Notice>
        </div>
      </BottomSheet>
    </>
  );
}
