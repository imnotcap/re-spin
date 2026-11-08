'use client';

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { track } from '../lib/analytics';

/**
 * Tæller sidevisninger og klik på elementer med data-track (fx data-track="sell_cta"), uden cookies.
 * Kort med data-listing tæller også, hvilken annonce der blev klikket på.
 */
export function Tracker() {
  const pathname = usePathname();
  useEffect(() => { track('pageview'); }, [pathname]);
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const el = (e.target as Element | null)?.closest?.<HTMLElement>('[data-track]');
      if (!el) return;
      track('click', { value: el.dataset.track!.slice(0, 100), listingId: el.dataset.listing, category: el.dataset.category });
    };
    document.addEventListener('click', onClick, { capture: true, passive: true });
    return () => document.removeEventListener('click', onClick, { capture: true });
  }, []);
  return null;
}

/** Visning af en annonce (ikke ejerens egne) */
export function TrackListingView({ id, category, owner }: { id: string; category: string; owner: boolean }) {
  useEffect(() => { if (!owner) track('listing_view', { listingId: id, category }); }, [id, category, owner]);
  return null;
}
