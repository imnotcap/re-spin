'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/** Henter nye beskeder, mens fanen er synlig – men ikke mens man skriver (fokus i et tekstfelt) */
export function AutoRefresh({ seconds = 15 }: { seconds?: number }) {
  const router = useRouter();
  useEffect(() => {
    const tick = () => {
      const typing = document.activeElement instanceof HTMLTextAreaElement && document.activeElement.value.length > 0;
      if (document.visibilityState === 'visible' && !typing) router.refresh();
    };
    const id = window.setInterval(tick, seconds * 1000);
    return () => window.clearInterval(id);
  }, [router, seconds]);
  return null;
}
