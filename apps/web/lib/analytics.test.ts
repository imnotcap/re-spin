import { afterEach, describe, expect, it, vi } from 'vitest';
import { insightsEvent } from './analytics';

describe('Vercel Analytics/Speed Insights', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('sender adressen uden query og hash (engangskoder forlader aldrig siden)', () => {
    vi.stubGlobal('navigator', { doNotTrack: null });
    expect(insightsEvent({ type: 'pageview', url: 'https://videro.dk/bekraeft-email/?token=hemmelig#x' })).toEqual({ type: 'pageview', url: 'https://videro.dk/bekraeft-email/' });
    expect(insightsEvent({ type: 'vital', url: 'https://videro.dk/soeg/?q=jakke', route: '/soeg' })).toEqual({ type: 'vital', url: 'https://videro.dk/soeg/', route: '/soeg' });
    expect(insightsEvent({ type: 'pageview', url: 'ikke en adresse' })).toBeNull();
  });

  it('sender intet ved Global Privacy Control eller Do Not Track', () => {
    vi.stubGlobal('navigator', { globalPrivacyControl: true });
    expect(insightsEvent({ type: 'pageview', url: 'https://videro.dk/' })).toBeNull();
    vi.stubGlobal('navigator', { doNotTrack: '1' });
    expect(insightsEvent({ type: 'pageview', url: 'https://videro.dk/' })).toBeNull();
  });
});
