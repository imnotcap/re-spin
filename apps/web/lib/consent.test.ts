import { describe, expect, it } from 'vitest';
import { CONSENT_MAX_AGE_DAYS, parseConsent } from './consent';

const now = Date.parse('2026-11-07T12:00:00Z');
const raw = (o: object) => JSON.stringify({ v: 1, necessary: true, statistics: false, marketing: false, at: '2026-11-01T12:00:00Z', ...o });

describe('cookiesamtykke', () => {
  it('gyldigt valg læses; nødvendige er altid til', () => {
    expect(parseConsent(raw({ statistics: true }), now)).toEqual({ v: 1, necessary: true, statistics: true, marketing: false, at: '2026-11-01T12:00:00Z' });
  });
  it('forældet version, forkerte typer, fremtidig dato, ødelagt JSON eller for gammelt → spørg igen', () => {
    for (const bad of [null, '', '{', 'null', '[]', raw({ v: 0 }), raw({ statistics: 'ja' }), raw({ marketing: 1 }), raw({ at: 'i går' }), raw({ at: '2027-01-01T00:00:00Z' })]) {
      expect(parseConsent(bad, now), String(bad)).toBeNull();
    }
    const old = new Date(now - (CONSENT_MAX_AGE_DAYS + 1) * 86_400_000).toISOString();
    expect(parseConsent(raw({ at: old }), now)).toBeNull();
  });
  it('ekstra felter (fx necessary: false) kan ikke slå de nødvendige fra', () => {
    expect(parseConsent(raw({ necessary: false }), now)?.necessary).toBe(true);
  });
});
