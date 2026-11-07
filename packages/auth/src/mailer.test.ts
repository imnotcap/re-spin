import { describe, expect, it, vi } from 'vitest';
import { ResendMailer, isSingleAddress } from './mailer';

const KEY = 're_test_abcdefghijklmnop';
const ok = () => vi.fn(async () => new Response('{"id":"x"}', { status: 200 }));

describe('ResendMailer', () => {
  it('sender én mail korrekt (Bearer-nøgle, JSON, ingen omdirigeringer, timeout)', async () => {
    const f = ok();
    const m = new ResendMailer({ apiKey: KEY, from: 're:spin <noreply@respin.dk>', fetch: f as unknown as typeof fetch });
    await m.send({ to: 'mette@example.dk', subject: 'Bekræft din e-mail', text: 'Hej\nlink' });
    expect(f).toHaveBeenCalledTimes(1);
    const [url, init] = f.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://api.resend.com/emails');
    expect(init.method).toBe('POST');
    expect((init.headers as Record<string, string>).Authorization).toBe(`Bearer ${KEY}`);
    expect(init.redirect).toBe('error');
    expect(init.signal).toBeInstanceOf(AbortSignal);
    expect(JSON.parse(String(init.body))).toEqual({ from: 're:spin <noreply@respin.dk>', to: ['mette@example.dk'], subject: 'Bekræft din e-mail', text: 'Hej\nlink' });
  });

  it('afviser header-injektion og flere modtagere – uden at kalde API’et', async () => {
    const f = ok();
    const m = new ResendMailer({ apiKey: KEY, from: 'noreply@respin.dk', fetch: f as unknown as typeof fetch });
    await expect(m.send({ to: 'a@b.dk', subject: 'Hej\r\nBcc: x@evil.dk', text: '' })).rejects.toThrow('Ugyldig');
    await expect(m.send({ to: 'a@b.dk, c@d.dk', subject: 'Hej', text: '' })).rejects.toThrow('Ugyldig');
    await expect(m.send({ to: 'a@b.dk\nBcc: x@evil.dk', subject: 'Hej', text: '' })).rejects.toThrow('Ugyldig');
    await expect(m.send({ to: 'ikke-en-adresse', subject: 'Hej', text: '' })).rejects.toThrow('Ugyldig');
    expect(f).not.toHaveBeenCalled();
  });

  it('fejl fra API’et kastes uden nøgle eller svartekst', async () => {
    const f = vi.fn(async () => new Response(`{"message":"invalid key ${KEY}"}`, { status: 401 }));
    const m = new ResendMailer({ apiKey: KEY, from: 'noreply@respin.dk', fetch: f as unknown as typeof fetch });
    const err = await m.send({ to: 'a@b.dk', subject: 'Hej', text: '' }).catch((e: Error) => e);
    expect(err).toBeInstanceOf(Error);
    expect((err as Error).message).toBe('Mail kunne ikke sendes (HTTP 401)');
    expect((err as Error).message).not.toContain(KEY);
  });

  it('netværksfejl og timeout giver korte, ufarlige fejl', async () => {
    const net = vi.fn(async () => { throw new TypeError(`fetch failed ${KEY}`); });
    const m1 = new ResendMailer({ apiKey: KEY, from: 'noreply@respin.dk', fetch: net as unknown as typeof fetch });
    await expect(m1.send({ to: 'a@b.dk', subject: 'Hej', text: '' })).rejects.toThrow(/^Mail kunne ikke sendes \(netværk\)$/);
    const slow = vi.fn(async () => { const e = new Error('slow'); e.name = 'TimeoutError'; throw e; });
    const m2 = new ResendMailer({ apiKey: KEY, from: 'noreply@respin.dk', fetch: slow as unknown as typeof fetch });
    await expect(m2.send({ to: 'a@b.dk', subject: 'Hej', text: '' })).rejects.toThrow('(timeout)');
  });

  it('konfiguration valideres ved opstart', () => {
    expect(() => new ResendMailer({ apiKey: 'sk_live_123', from: 'noreply@respin.dk' })).toThrow('RESEND_API_KEY');
    expect(() => new ResendMailer({ apiKey: KEY, from: 'noreply@respin.dk\r\nBcc: x@evil.dk' })).toThrow('MAIL_FROM');
    expect(() => new ResendMailer({ apiKey: KEY, from: 're:spin' })).toThrow('MAIL_FROM');
    expect(() => new ResendMailer({ apiKey: KEY, from: 're:spin <noreply@respin.dk>' })).not.toThrow();
  });

  it('adressetjek: korrekte grænser og lineær tid på ondsindet input (ReDoS)', () => {
    for (const ok of ['a@b.dk', 'mette.hansen+test@mail.example.dk', 'a@b..dk', 'a@b.c']) expect(isSingleAddress(ok)).toBe(true);
    for (const bad of ['', 'a@b', 'a@.dk', 'a@dk.', 'a@b@c.dk', '@b.dk', 'a b@c.dk', 'a@b.dk,c@d.dk', '<a@b.dk>', 'a@b.dk\n', `${'a'.repeat(250)}@b.dk`]) expect(isSingleAddress(bad)).toBe(false);
    const evil = '!@!.' + '!.'.repeat(50_000) + ' '; // den gamle regex brugte ~2 s på denne streng (kvadratisk)
    const t = performance.now();
    expect(isSingleAddress(evil)).toBe(false);
    expect(() => new ResendMailer({ apiKey: KEY, from: '<!@!.' + '!.'.repeat(50_000) + ' ' })).toThrow('MAIL_FROM');
    expect(performance.now() - t).toBeLessThan(50);
  });
});
