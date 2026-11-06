'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';

/**
 * Monterer først tunge, interaktive dele, når de nærmer sig skærmen (lazy load).
 * Pladsen reserveres på forhånd (minHeight), så siden ikke hopper (ingen layout shift).
 */
export function LazyMount({ children, fallback, minHeight, rootMargin = '400px 0px' }: { children: ReactNode; fallback: ReactNode; minHeight: number; rootMargin?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === 'undefined') { setVisible(true); return; }
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) { setVisible(true); io.disconnect(); }
    }, { rootMargin });
    io.observe(el);
    return () => io.disconnect();
  }, [rootMargin]);
  return <div ref={ref} style={{ minHeight }}>{visible ? children : fallback}</div>;
}
