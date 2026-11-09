import { describe, expect, it } from 'vitest';
import { ORDER_EVENTS, ORDER_STATUSES, TERMINAL_STATUSES, availableEvents, transition, type Actor } from './order';

const ACTORS: Actor[] = ['buyer', 'seller', 'system', 'admin'];

describe('ordre-tilstandsmaskine', () => {
  it('den lykkelige vej: betalt → afsendt → leveret → gennemført', () => {
    const paid = transition('pending_payment', 'payment_succeeded', 'system');
    expect(paid).toMatchObject({ ok: true, to: 'paid', effect: 'hold_funds' });
    expect(transition('paid', 'seller_ship', 'seller')).toMatchObject({ ok: true, to: 'shipped' });
    expect(transition('shipped', 'carrier_delivered', 'system')).toMatchObject({ ok: true, to: 'delivered' });
    expect(transition('shipped', 'buyer_received', 'buyer')).toMatchObject({ ok: true, to: 'delivered', effect: 'none' });
    expect(transition('shipped', 'buyer_received', 'seller').ok).toBe(false);
    expect(transition('paid', 'carrier_picked_up', 'system')).toMatchObject({ ok: true, to: 'shipped' });
    expect(transition('paid', 'carrier_picked_up', 'seller').ok).toBe(false);
    expect(transition('delivered', 'buyer_approve', 'buyer')).toMatchObject({ ok: true, to: 'completed', effect: 'release_to_seller' });
  });
  it('kan ikke springe trin over', () => {
    expect(transition('pending_payment', 'seller_ship', 'seller')).toMatchObject({ ok: false, reason: 'invalid_state' });
    expect(transition('paid', 'buyer_approve', 'buyer')).toMatchObject({ ok: false, reason: 'invalid_state' });
    expect(transition('shipped', 'auto_complete', 'system')).toMatchObject({ ok: false, reason: 'invalid_state' });
  });
  it('kun den rette aktør kan udløse en overgang', () => {
    expect(transition('pending_payment', 'payment_succeeded', 'buyer')).toMatchObject({ ok: false, reason: 'forbidden_actor' });
    expect(transition('pending_payment', 'payment_succeeded', 'seller')).toMatchObject({ ok: false, reason: 'forbidden_actor' });
    expect(transition('delivered', 'buyer_approve', 'seller')).toMatchObject({ ok: false, reason: 'forbidden_actor' });
    expect(transition('disputed', 'admin_resolve_buyer', 'seller')).toMatchObject({ ok: false, reason: 'forbidden_actor' });
  });
  it('sælger kan ikke frigive sine egne penge', () => {
    for (const status of ORDER_STATUSES) {
      for (const ev of ORDER_EVENTS) {
        const r = transition(status, ev, 'seller');
        if (r.ok) expect(r.effect).not.toBe('release_to_seller');
      }
    }
  });
  it('afsluttede ordrer kan ikke ændres af nogen', () => {
    for (const status of TERMINAL_STATUSES) for (const ev of ORDER_EVENTS) for (const actor of ACTORS) {
      expect(transition(status, ev, actor)).toMatchObject({ ok: false, reason: 'already_terminal' });
    }
  });
  it('penge frigives kun ved completed, og kun efter leveret eller afgjort tvist', () => {
    for (const status of ORDER_STATUSES) for (const ev of ORDER_EVENTS) for (const actor of ACTORS) {
      const r = transition(status, ev, actor);
      if (r.ok && r.effect === 'release_to_seller') expect(['delivered', 'disputed']).toContain(r.from);
    }
  });
  it('tvist kan kun afgøres af admin', () => {
    expect(availableEvents('disputed', 'admin').sort()).toEqual(['admin_refund', 'admin_resolve_buyer', 'admin_resolve_seller'].filter((e) => e !== 'admin_refund').sort());
    expect(availableEvents('disputed', 'buyer')).toEqual([]);
    expect(availableEvents('disputed', 'seller')).toEqual([]);
  });
});
