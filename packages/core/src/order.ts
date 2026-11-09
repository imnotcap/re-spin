/**
 * Ordre-tilstandsmaskine. Ren funktion: ingen database, ingen Stripe.
 * Alle ændringer af en ordres status SKAL gå gennem `transition()`, så ingen kan springe trin over
 * (fx markere en ubetalt ordre som afsendt) og så kun den rette aktør kan udløse hver overgang.
 */
export const ORDER_STATUSES = ['pending_payment', 'paid', 'shipped', 'delivered', 'completed', 'disputed', 'refunded', 'cancelled', 'expired'] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export type Actor = 'buyer' | 'seller' | 'system' | 'admin';

export const ORDER_EVENTS = [
  'payment_succeeded', 'payment_expired', 'buyer_cancel', 'seller_ship', 'seller_cancel', 'ship_timeout',
  'carrier_delivered', 'buyer_received', 'buyer_approve', 'buyer_dispute', 'auto_complete', 'admin_resolve_seller', 'admin_resolve_buyer', 'admin_refund'
] as const;
export type OrderEvent = (typeof ORDER_EVENTS)[number];

/** Pengeeffekter en overgang udløser (udføres af betalingslaget, ikke her) */
export type MoneyEffect = 'hold_funds' | 'release_to_seller' | 'refund_buyer' | 'none';

interface Rule { from: readonly OrderStatus[]; to: OrderStatus; actors: readonly Actor[]; effect: MoneyEffect }

const RULES: Record<OrderEvent, Rule> = {
  payment_succeeded:    { from: ['pending_payment'], to: 'paid',      actors: ['system'],                 effect: 'hold_funds' },
  payment_expired:      { from: ['pending_payment'], to: 'expired',   actors: ['system'],                 effect: 'none' },
  buyer_cancel:         { from: ['pending_payment'], to: 'cancelled', actors: ['buyer'],                  effect: 'none' },
  seller_ship:          { from: ['paid'],            to: 'shipped',   actors: ['seller'],                 effect: 'none' },
  seller_cancel:        { from: ['paid'],            to: 'refunded',  actors: ['seller'],                 effect: 'refund_buyer' },
  ship_timeout:         { from: ['paid'],            to: 'refunded',  actors: ['system'],                 effect: 'refund_buyer' },
  carrier_delivered:    { from: ['shipped'],         to: 'delivered', actors: ['system'],                 effect: 'none' },
  /** Køber bekræfter at have modtaget pakken (indtil der er sporing fra fragtfirmaet) → 48 timer til at godkende/reklamere */
  buyer_received:       { from: ['shipped'],         to: 'delivered', actors: ['buyer'],                  effect: 'none' },
  buyer_approve:        { from: ['delivered'],       to: 'completed', actors: ['buyer'],                  effect: 'release_to_seller' },
  auto_complete:        { from: ['delivered'],       to: 'completed', actors: ['system'],                 effect: 'release_to_seller' },
  buyer_dispute:        { from: ['delivered'],       to: 'disputed',  actors: ['buyer'],                  effect: 'none' },
  admin_resolve_seller: { from: ['disputed'],        to: 'completed', actors: ['admin'],                  effect: 'release_to_seller' },
  admin_resolve_buyer:  { from: ['disputed'],        to: 'refunded',  actors: ['admin'],                  effect: 'refund_buyer' },
  admin_refund:         { from: ['paid', 'shipped', 'delivered'], to: 'refunded', actors: ['admin'],     effect: 'refund_buyer' }
};

/** Uden sporing: pakken regnes for leveret så mange dage efter afsendelse, hvis køber ikke har meldt noget (så starter de 48 timer) */
export const ASSUME_DELIVERED_DAYS = 10;
/** Tid køber har til at godkende eller reklamere, før pengene frigives automatisk */
export const AUTO_COMPLETE_AFTER_HOURS = 48;
/** Tid sælger har til at sende, før køber automatisk får pengene tilbage */
export const SHIP_DEADLINE_DAYS = 5;
/** Tid køber har til at betale, før ordren udløber (og varen frigives igen) */
export const PAYMENT_WINDOW_MINUTES = 30;

export const TERMINAL_STATUSES: readonly OrderStatus[] = ['completed', 'refunded', 'cancelled', 'expired'];

export type TransitionResult =
  | { ok: true; from: OrderStatus; to: OrderStatus; effect: MoneyEffect }
  | { ok: false; reason: 'invalid_state' | 'forbidden_actor' | 'already_terminal'; message: string };

export function transition(current: OrderStatus, event: OrderEvent, actor: Actor): TransitionResult {
  const rule = RULES[event];
  if (TERMINAL_STATUSES.includes(current)) return { ok: false, reason: 'already_terminal', message: `Ordren er afsluttet (${current})` };
  if (!rule.from.includes(current)) return { ok: false, reason: 'invalid_state', message: `${event} er ikke tilladt fra ${current}` };
  if (!rule.actors.includes(actor)) return { ok: false, reason: 'forbidden_actor', message: `${actor} må ikke udløse ${event}` };
  return { ok: true, from: current, to: rule.to, effect: rule.effect };
}

/** Hvilke events kan en given aktør udløse i en given status? (til UI og autorisering) */
export function availableEvents(current: OrderStatus, actor: Actor): OrderEvent[] {
  return ORDER_EVENTS.filter((e) => transition(current, e, actor).ok);
}
