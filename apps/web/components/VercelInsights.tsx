'use client';

import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { insightsEvent } from '../lib/analytics';

/**
 * Vercel Web Analytics (besøg, sider, henvisninger) og Speed Insights (Core Web Vitals). Begge er uden cookies og
 * sender kun til siden selv (/_vercel/…), så CSP'en ikke skal udvides.
 * Før noget sendes, fjernes query og hash fra adressen (engangskoder i fx /bekraeft-email/?token=… må aldrig forlade
 * siden), og browsere med "Global Privacy Control" eller "Do Not Track" sender slet ingenting – se insightsEvent().
 */
export function VercelInsights() {
  return (
    <>
      <Analytics beforeSend={insightsEvent} />
      <SpeedInsights beforeSend={insightsEvent} />
    </>
  );
}
