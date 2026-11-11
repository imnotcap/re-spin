/**
 * Statistik uden cookies (bruges i browseren). Der gemmes intet på enheden og sendes intet personligt:
 * kun sidens sti, evt. annonce-id, søgeord/klikmål og hvilken side man kom fra (kun domænet).
 * Browsere med "Global Privacy Control" eller "Do Not Track" sender slet ingenting.
 */
export type AnalyticsType = 'pageview' | 'listing_view' | 'click' | 'search' | 'favorite' | 'share';
export interface AnalyticsData { listingId?: string; category?: string; value?: string; num?: number }

export function optedOut(): boolean {
  const n = navigator as Navigator & { globalPrivacyControl?: boolean };
  return n.globalPrivacyControl === true || n.doNotTrack === '1';
}

/**
 * Til Vercel Web Analytics og Speed Insights: adressen uden query og hash (nogle adresser bærer engangskoder,
 * fx /bekraeft-email/?token=…), og intet ved "Global Privacy Control"/"Do Not Track".
 */
export function insightsEvent<T extends { url: string }>(event: T): T | null {
  if (optedOut()) return null;
  try {
    const u = new URL(event.url);
    return { ...event, url: `${u.origin}${u.pathname}` };
  } catch {
    return null;
  }
}

/** Domænet man kom fra – kun ved første visning og kun andre sider end vores egen */
function referrerHost(): string | undefined {
  try {
    const h = document.referrer ? new URL(document.referrer).hostname : '';
    return h && h !== location.hostname ? h.replace(/^www\./, '').slice(0, 100) : undefined;
  } catch { return undefined; }
}

export function track(type: AnalyticsType, data: AnalyticsData = {}): void {
  if (typeof window === 'undefined' || optedOut()) return;
  const body = JSON.stringify({ t: type, p: location.pathname.slice(0, 200), r: type === 'pageview' ? referrerHost() : undefined, ...data });
  try {
    const blob = new Blob([body], { type: 'application/json' });
    if (!navigator.sendBeacon?.('/api/e/', blob)) void fetch('/api/e/', { method: 'POST', body, keepalive: true, headers: { 'content-type': 'application/json' } }).catch(() => {});
  } catch { /* statistik må aldrig ødelægge siden */ }
}
