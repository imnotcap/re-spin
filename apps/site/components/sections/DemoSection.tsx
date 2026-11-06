'use client';

import dynamic from 'next/dynamic';
import { LazyMount } from '../LazyMount';
import { SectionHeading } from '../SectionHeading';

const DemoApp = dynamic(() => import('./DemoApp'), { ssr: false, loading: () => <DemoPlaceholder /> });

function DemoPlaceholder() {
  return <div className="mx-auto h-[640px] w-full max-w-[380px] animate-pulse rounded-[40px] border-[10px] border-stone-200 bg-sunken" aria-label="Demoen indlæses" role="status" />;
}

export function DemoSection() {
  return (
    <section aria-labelledby="demo-title" id="demo" className="mx-auto max-w-6xl scroll-mt-24 px-4 pt-24 sm:px-6">
      <SectionHeading id="demo-title" eyebrow="Prøv selv" title="Sådan føles appen" intro="Filtrér, gem favoritter og åbn en vare for at se, hvad du betaler. Priserne beregnes præcis som i den rigtige app." />
      <div className="mt-10">
        <LazyMount minHeight={640} fallback={<DemoPlaceholder />}>
          <DemoApp />
        </LazyMount>
        <noscript><p className="mt-4 text-center text-small text-muted">Demoen kræver JavaScript.</p></noscript>
      </div>
    </section>
  );
}
