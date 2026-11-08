'use client';

import { useActionState, useId, useState } from 'react';
import { BottomSheet, Button, FavoriteButton, Field, Notice, PriceSummary, useToast } from '@respin/ui';
import { SHIPPING_PRICE_ORE, computeOrderAmounts } from '@respin/core/fees';
import { formatOre, fromKr } from '@respin/core/money';
import { buyerTotal, formatKr } from '@respin/ui/utils';
import { useFavorites } from '../../lib/favorites';
import { track } from '../../lib/analytics';
import { useI18n } from '../../lib/i18n/client';
import { makeOfferAction, type OfferState } from '../../lib/conversation-actions';

const AUTH = process.env.NEXT_PUBLIC_AUTH_ENABLED === '1';
/** Laveste bud: 40 % af prisen (samme regel som serveren), rundet op til hele kroner */
const minOffer = (price: number) => Math.ceil(price * 0.4);

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
 * Køb, bud, besked og favorit. Bud og beskeder går til samtalen med sælgeren (ikke logget ind → log ind først).
 * Køb er ikke åbnet endnu – men "Køb nu" viser præcis, hvad købet ville koste (samme beregning som checkout).
 */
export function ItemActions({ id, title, meta, price, parcel, favorites, sellerName, sellerCertified }: ItemActionsProps) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const fav = useFavorites();
  const on = fav.has(id);
  const a = computeOrderAmounts({ price: fromKr(price), shipping: SHIPPING_PRICE_ORE[parcel], sellerCertified });
  const { t, n } = useI18n();
  const [offerOpen, setOfferOpen] = useState(false);
  const [offer, offerAction, sending] = useActionState<OfferState, FormData>(makeOfferAction, undefined);
  const offerForm = useId();

  return (
    <>
      <div className="grid gap-3">
        <Button full size="lg" variant="buy" onClick={() => setOpen(true)} aria-haspopup="dialog" data-track="buy_now" data-listing={id}>{t('buy.now')}</Button>
        <div className="grid grid-cols-2 gap-3 empty:hidden">
          {AUTH && (
            <>
              <Button full variant="outline" onClick={() => setOfferOpen(true)} aria-haspopup="dialog" data-track="offer" data-listing={id}>{t('buy.offer')}</Button>
              <Button full href={`/konto/beskeder/ny/${id}/`} variant="outline" icon="chat" data-track="message" data-listing={id}>{t('buy.message')}</Button>
            </>
          )}
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
            {t('buy.held', { seller: sellerName, payout: formatOre(a.sellerPayout) })}
          </Notice>
          <Notice icon="info" warn>{t('buy.testNotice')}</Notice>
        </div>
      </BottomSheet>

      {AUTH && (
        <BottomSheet placement="viewport" open={offerOpen} onClose={() => setOfferOpen(false)} title={t('offer.title')}
          footer={<Button full size="lg" type="submit" form={offerForm} disabled={sending}>{t('offer.send')}</Button>}>
          <form id={offerForm} action={offerAction} className="flex flex-col gap-4" noValidate>
            <input type="hidden" name="listingId" value={id} />
            <div>
              <p className="font-semibold">{title}</p>
              <p className="text-small text-muted">{formatKr(price)}</p>
            </div>
            <Field label={t('offer.amount')} name="amount" inputMode="numeric" autoComplete="off" suffix="kr." required
              hint={t('offer.hint', { min: formatKr(minOffer(price)), price: formatKr(price) })} error={offer?.error} />
            <Notice icon="shield">{t('offer.note')}</Notice>
          </form>
        </BottomSheet>
      )}
    </>
  );
}
