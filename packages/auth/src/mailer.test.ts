import { describe, expect, it, vi } from 'vitest';
import { ResendMailer, isSingleAddress, templates } from './mailer';
import { renderMail } from './mail-html';

const KEY = 're_test_abcdefghijklmnop';
const ok = () => vi.fn(async () => new Response('{"id":"x"}', { status: 200 }));

describe('ResendMailer', () => {
  it('sender én mail korrekt (Bearer-nøgle, JSON, ingen omdirigeringer, timeout)', async () => {
    const f = ok();
    const m = new ResendMailer({ apiKey: KEY, from: 'Videro <noreply@videro.dk>', fetch: f as unknown as typeof fetch });
    await m.send({ to: 'mette@example.dk', subject: 'Bekræft din e-mail', text: 'Hej\nlink' });
    expect(f).toHaveBeenCalledTimes(1);
    const [url, init] = f.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://api.resend.com/emails');
    expect(init.method).toBe('POST');
    expect((init.headers as Record<string, string>).Authorization).toBe(`Bearer ${KEY}`);
    expect(init.redirect).toBe('error');
    expect(init.signal).toBeInstanceOf(AbortSignal);
    expect(JSON.parse(String(init.body))).toEqual({ from: 'Videro <noreply@videro.dk>', to: ['mette@example.dk'], subject: 'Bekræft din e-mail', text: 'Hej\nlink' });
  });

  it('afviser header-injektion og flere modtagere – uden at kalde API’et', async () => {
    const f = ok();
    const m = new ResendMailer({ apiKey: KEY, from: 'noreply@videro.dk', fetch: f as unknown as typeof fetch });
    await expect(m.send({ to: 'a@b.dk', subject: 'Hej\r\nBcc: x@evil.dk', text: '' })).rejects.toThrow('Ugyldig');
    await expect(m.send({ to: 'a@b.dk, c@d.dk', subject: 'Hej', text: '' })).rejects.toThrow('Ugyldig');
    await expect(m.send({ to: 'a@b.dk\nBcc: x@evil.dk', subject: 'Hej', text: '' })).rejects.toThrow('Ugyldig');
    await expect(m.send({ to: 'ikke-en-adresse', subject: 'Hej', text: '' })).rejects.toThrow('Ugyldig');
    expect(f).not.toHaveBeenCalled();
  });

  it('fejl fra API’et kastes uden nøgle eller svartekst', async () => {
    const f = vi.fn(async () => new Response(`{"message":"invalid key ${KEY}"}`, { status: 401 }));
    const m = new ResendMailer({ apiKey: KEY, from: 'noreply@videro.dk', fetch: f as unknown as typeof fetch });
    const err = await m.send({ to: 'a@b.dk', subject: 'Hej', text: '' }).catch((e: Error) => e);
    expect(err).toBeInstanceOf(Error);
    expect((err as Error).message).toBe('Mail kunne ikke sendes (HTTP 401)');
    expect((err as Error).message).not.toContain(KEY);
  });

  it('netværksfejl og timeout giver korte, ufarlige fejl', async () => {
    const net = vi.fn(async () => { throw new TypeError(`fetch failed ${KEY}`); });
    const m1 = new ResendMailer({ apiKey: KEY, from: 'noreply@videro.dk', fetch: net as unknown as typeof fetch });
    await expect(m1.send({ to: 'a@b.dk', subject: 'Hej', text: '' })).rejects.toThrow(/^Mail kunne ikke sendes \(netværk\)$/);
    const slow = vi.fn(async () => { const e = new Error('slow'); e.name = 'TimeoutError'; throw e; });
    const m2 = new ResendMailer({ apiKey: KEY, from: 'noreply@videro.dk', fetch: slow as unknown as typeof fetch });
    await expect(m2.send({ to: 'a@b.dk', subject: 'Hej', text: '' })).rejects.toThrow('(timeout)');
  });

  it('konfiguration valideres ved opstart', () => {
    expect(() => new ResendMailer({ apiKey: 'sk_live_123', from: 'noreply@videro.dk' })).toThrow('RESEND_API_KEY');
    expect(() => new ResendMailer({ apiKey: KEY, from: 'noreply@videro.dk\r\nBcc: x@evil.dk' })).toThrow('MAIL_FROM');
    expect(() => new ResendMailer({ apiKey: KEY, from: 'Videro' })).toThrow('MAIL_FROM');
    expect(() => new ResendMailer({ apiKey: KEY, from: 'Videro <noreply@videro.dk>' })).not.toThrow();
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

describe('HTML-mails', () => {
  const link = 'https://videro.dk/bekraeft-email/?token=abc_DEF-123';

  it('bekræftelsesmailen har både tekst og HTML i Videros tema med knap, link og logo', () => {
    const m = templates.verify(link);
    expect(m.text).toContain(link);
    expect(m.html).toContain('Bekræft din e-mail');
    expect(m.html).toContain(`href="${link}"`);
    expect(m.html).toContain('https://videro.dk/img/mail/logo-lime.png');
    expect(m.html).toContain('#d2ff32');
    expect(m.html).toContain('#0e5a2f');
  });

  it('escaper indhold og afviser andet end http(s)-links', () => {
    const html = renderMail({ preheader: '<b>', heading: 'Hej "<script>alert(1)</script>"', paragraphs: ['a & b'], button: { label: '<i>Klik</i>', href: 'https://videro.dk/x?a=1&b="2"' } });
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
    expect(html).toContain('a &amp; b');
    expect(html).toContain('a=1&amp;b=%222%22');
    expect(() => renderMail({ preheader: '', heading: '', paragraphs: [], button: { label: 'x', href: 'javascript:alert(1)' } })).toThrow('Ugyldigt link');
  });

  it('Resend får html med, når mailen har en', async () => {
    const f = ok();
    const m = new ResendMailer({ apiKey: KEY, from: 'Videro <noreply@videro.dk>', fetch: f as unknown as typeof fetch });
    await m.send({ to: 'mette@example.dk', ...templates.verify(link) });
    const body = JSON.parse(String((f.mock.calls[0] as unknown as [string, RequestInit])[1].body));
    expect(body.text).toContain(link);
    expect(body.html).toContain('<!doctype html>');
  });
});
