'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/** Henter nye beskeder med jævne mellemrum, mens fanen er synlig (ingen forespørgsler i baggrunden). */
export function AutoRefresh({ seconds = 10 }: { seconds?: number }) {
  const router = useRouter();
  useEffect(() => {
    const tick = () => { if (document.visibilityState === 'visible') router.refresh(); };
    const id = window.setInterval(tick, seconds * 1000);
    document.addEventListener('visibilitychange', tick);
    return () => { window.clearInterval(id); document.removeEventListener('visibilitychange', tick); };
  }, [router, seconds]);
  return null;
}
