import { describe, expect, it } from 'vitest';
import { isInternal, splitLinks } from './chat-links';

describe('links i beskeder', () => {
  it('finder http(s)- og www-links og lader tegnsætning efter linket være', () => {
    expect(splitLinks('Se https://evil.example/betal?id=1. Eller www.shop.dk!')).toEqual([
      { text: 'Se ' }, { text: 'https://evil.example/betal?id=1', href: 'https://evil.example/betal?id=1' },
      { text: '. Eller ' }, { text: 'www.shop.dk', href: 'https://www.shop.dk/' }, { text: '!' }
    ]);
    expect(splitLinks('Ingen links her')).toEqual([{ text: 'Ingen links her' }]);
  });

  it('javascript: og andre skemaer bliver ikke til links', () => {
    expect(splitLinks('javascript:alert(1)').some((p) => 'href' in p)).toBe(false);
    expect(splitLinks('data:text/html,<b>x</b>').some((p) => 'href' in p)).toBe(false);
  });

  it('links til Videro selv er interne (ingen advarsel), alt andet er udgående', () => {
    expect(isInternal('https://videro.dk/annonce/x/', 'videro.dk')).toBe(true);
    expect(isInternal('https://www.videro.dk/', 'videro.dk')).toBe(true);
    expect(isInternal('https://videro.dk.evil.example/', 'videro.dk')).toBe(false);
    expect(isInternal('https://evil.example/', 'videro.dk')).toBe(false);
  });
});
