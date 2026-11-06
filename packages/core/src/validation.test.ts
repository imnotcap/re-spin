import { describe, expect, it } from 'vitest';
import { createListingInput, makeOfferInput, normalizeUserText, sendMessageInput } from './validation';
import { assessMessageRisk } from './risk';

const uuid = '123e4567-e89b-42d3-a456-426614174000';
const valid = { title: 'Ganni uldjakke', description: 'Brugt to gange', category: 'vintage', condition: 'almost_new', priceOre: 45_000, shippingSize: 'small', imageKeys: [uuid] };

describe('normalizeUserText', () => {
  it('fjerner usynlige og retningsskiftende tegn og kontroltegn', () => {
    expect(normalizeUserText('he\u202Ello\u200B wor\u0000ld')).toBe('hello world');
    expect(normalizeUserText('  a\r\nb  ')).toBe('a\nb');
  });
  it('normaliserer unicode (NFC)', () => {
    expect(normalizeUserText('e\u0301')).toBe('\u00e9');
  });
  it('lader HTML stå som tekst (escapes ved visning, ikke her)', () => {
    expect(normalizeUserText('<b>hej</b>')).toBe('<b>hej</b>');
  });
});

describe('inputvalidering', () => {
  it('accepterer gyldig annonce', () => expect(createListingInput.safeParse(valid).success).toBe(true));
  it('afviser for lav/høj pris, decimaler og ukendte felter', () => {
    expect(createListingInput.safeParse({ ...valid, priceOre: 50 }).success).toBe(false);
    expect(createListingInput.safeParse({ ...valid, priceOre: 10_000_001 }).success).toBe(false);
    expect(createListingInput.safeParse({ ...valid, priceOre: 100.5 }).success).toBe(false);
    expect(createListingInput.safeParse({ ...valid, isAdmin: true }).success).toBe(false); // mass assignment
  });
  it('afviser billed-nøgler der ikke er server-genererede uuid’er (fx URL’er og stier)', () => {
    expect(createListingInput.safeParse({ ...valid, imageKeys: ['https://evil.example/x.png'] }).success).toBe(false);
    expect(createListingInput.safeParse({ ...valid, imageKeys: ['../../etc/passwd'] }).success).toBe(false);
    expect(createListingInput.safeParse({ ...valid, imageKeys: [] }).success).toBe(false);
  });
  it('trimmer og afviser tomme titler (efter rensning)', () => {
    expect(createListingInput.safeParse({ ...valid, title: '\u200B\u200B  ' }).success).toBe(false);
  });
  it('bud og beskeder', () => {
    expect(makeOfferInput.safeParse({ listingId: uuid, amountOre: 30_000 }).success).toBe(true);
    expect(makeOfferInput.safeParse({ listingId: 'abc', amountOre: 30_000 }).success).toBe(false);
    expect(sendMessageInput.safeParse({ conversationId: uuid, body: '   ' }).success).toBe(false);
  });
});

describe('risikovurdering af beskeder', () => {
  it('flager betaling uden for platformen som høj risiko', () => {
    expect(assessMessageRisk('Send til MobilePay 12 34 56 78 i stedet').level).toBe('high');
    expect(assessMessageRisk('kan du overføre til min konto').flags).toContain('off_platform_payment');
  });
  it('flager eksterne kontaktveje', () => {
    expect(assessMessageRisk('skriv til mig på whatsapp').flags).toContain('external_contact');
    expect(assessMessageRisk('se https://example.com/x').flags).toContain('external_link');
  });
  it('lader almindelig samtale være', () => {
    expect(assessMessageRisk('Hej! Er den stadig til salg? Passer den til str. M?')).toEqual({ level: 'low', flags: [] });
  });
});
