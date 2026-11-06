'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';

/**
 * Tonet ind ved scroll – uden at skjule noget i den server-renderede HTML.
 * Indholdet er synligt uden JavaScript og ved "reducer bevægelse". Kun elementer, der er under skærmkanten
 * når siden indlæses, skjules (usynligt for brugeren) og tones ind, når de kommer i syne.
 */
export function Reveal({ children, delay = 0, className = '' }: { children: ReactNode; delay?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState<'static' | 'hidden' | 'shown'>('static');

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (el.getBoundingClientRect().top < window.innerHeight * 0.92) return; // allerede synlig: ingen animation
    setPhase('hidden');
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) { setPhase('shown'); io.disconnect(); }
    }, { rootMargin: '0px 0px -8% 0px' });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      data-reveal={phase}
      className={`${phase === 'hidden' ? 'translate-y-5 opacity-0' : 'translate-y-0 opacity-100'} ${phase === 'static' ? '' : 'transition-[opacity,transform] duration-700 ease-respin'} ${className}`}
      style={phase === 'shown' && delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </div>
  );
}
