'use client';

/**
 * React Bits-komponent (RotatingText), der hentes først når browseren er ledig (lazy load):
 *  - Fallback er altid den endelige, rigtige tekst → indhold i HTML'en, virker uden JS, intet layout-hop.
 *  - Er elementet allerede synligt ved indlæsning (eller ønskes reduceret bevægelse), animeres det IKKE –
 *    så der hverken flimrer eller hentes unødig kode. Kun elementer man scroller hen til, animeres.
 */
import { useEffect, useRef, useState, type ComponentType, type RefObject } from 'react';

type Trigger = 'idle' | 'scroll';

function useLoadWhen(ref: RefObject<Element | null>, trigger: Trigger): boolean {
  const [load, setLoad] = useState(false);
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (trigger === 'idle') {
      const w = window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number; cancelIdleCallback?: (id: number) => void };
      if (w.requestIdleCallback) { const id = w.requestIdleCallback(() => setLoad(true), { timeout: 2500 }); return () => w.cancelIdleCallback?.(id); }
      const t = window.setTimeout(() => setLoad(true), 800);
      return () => window.clearTimeout(t);
    }
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight && rect.bottom > 0) return; // allerede synlig: forbliv statisk
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) { setLoad(true); io.disconnect(); }
    }, { rootMargin: '300px 0px' });
    io.observe(el);
    return () => io.disconnect();
  }, [ref, trigger]);
  return load;
}

function useLazyComponent<P>(loader: () => Promise<{ default: ComponentType<P> }>, enabled: boolean): ComponentType<P> | null {
  const [Comp, setComp] = useState<ComponentType<P> | null>(null);
  useEffect(() => {
    if (!enabled || Comp) return;
    let alive = true;
    loader().then((m) => { if (alive) setComp(() => m.default); }).catch(() => { /* forbliv på den statiske fallback */ });
    return () => { alive = false; };
  }, [enabled, Comp, loader]);
  return Comp;
}

const loadRotatingText = () => import('./reactbits/RotatingText');

/** Hent og start først, når siden har stået stille et øjeblik – så det skiftende ord ikke forsinker første visning (Speed Index) */
function useAfter(ready: boolean, ms: number): boolean {
  const [done, setDone] = useState(false);
  useEffect(() => {
    if (!ready) return;
    const t = window.setTimeout(() => setDone(true), ms);
    return () => window.clearTimeout(t);
  }, [ready, ms]);
  return done;
}

export function LazyRotatingText({ texts, interval = 2600, startDelay = 3500 }: { texts: [string, ...string[]]; interval?: number; startDelay?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const C = useLazyComponent(loadRotatingText, useAfter(useLoadWhen(ref, 'idle'), startDelay));
  return (
    <span ref={ref} className="inline-block align-bottom">
      {C ? <C texts={texts} rotationInterval={interval} mainClassName="overflow-hidden" staggerDuration={0.02} /> : texts[0]}
    </span>
  );
}
