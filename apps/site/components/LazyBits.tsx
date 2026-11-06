'use client';

/**
 * React Bits-komponenter, der hentes først når de behøves (lazy load):
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

const loadCountUp = () => import('./reactbits/CountUp');
const loadBlurText = () => import('./reactbits/BlurText');
const loadRotatingText = () => import('./reactbits/RotatingText');

export function LazyCountUp({ to, suffix = '', duration = 1.6 }: { to: number; suffix?: string; duration?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const C = useLazyComponent(loadCountUp, useLoadWhen(ref, 'scroll'));
  return <span ref={ref}>{C ? <C to={to} suffix={suffix} duration={duration} separator="." /> : `${to.toLocaleString('da-DK')}${suffix}`}</span>;
}

export function LazyBlurText({ text, className = '' }: { text: string; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const C = useLazyComponent(loadBlurText, useLoadWhen(ref, 'scroll'));
  return <div ref={ref}>{C ? <C text={text} animateBy="words" delay={60} className={className} /> : <p className={className}>{text}</p>}</div>;
}

export function LazyRotatingText({ texts, interval = 2600 }: { texts: [string, ...string[]]; interval?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const C = useLazyComponent(loadRotatingText, useLoadWhen(ref, 'idle'));
  return (
    <span ref={ref} className="inline-block align-bottom">
      {C ? <C texts={texts} rotationInterval={interval} mainClassName="overflow-hidden" staggerDuration={0.02} /> : texts[0]}
    </span>
  );
}
