import type { ReactNode } from 'react';
import { Reveal } from './Reveal';

export function SectionHeading({ eyebrow, title, intro, id }: { eyebrow?: string; title: string; intro?: ReactNode; id?: string }) {
  return (
    <Reveal className="mx-auto max-w-2xl text-center">
      {eyebrow && <p className="text-small font-bold uppercase tracking-[0.12em] text-forest">{eyebrow}</p>}
      <h2 id={id} className="mt-2 text-h1 sm:text-[34px] sm:leading-[40px]">{title}</h2>
      {intro && <p className="mt-3 text-body text-muted sm:text-[17px] sm:leading-[26px]">{intro}</p>}
    </Reveal>
  );
}
