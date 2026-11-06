import { Icon } from '@respin/ui';
import { FAQ } from '../../lib/content';
import { SectionHeading } from '../SectionHeading';

/** Native <details>: tilgængelig, virker uden JavaScript og kan søges med Ctrl+F */
export function Faq() {
  return (
    <section aria-labelledby="faq-title" id="faq" className="mx-auto max-w-3xl scroll-mt-24 px-4 pt-24 sm:px-6">
      <SectionHeading id="faq-title" eyebrow="Spørgsmål" title="Ofte stillede spørgsmål" />
      <div className="mt-10 divide-y divide-line overflow-hidden rounded-lg border border-line bg-surface">
        {FAQ.map((f) => (
          <details key={f.q} className="group">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 text-body font-semibold [&::-webkit-details-marker]:hidden">
              {f.q}
              <span className="shrink-0 transition-transform duration-200 group-open:rotate-180 motion-reduce:transition-none"><Icon name="down" size={20} /></span>
            </summary>
            <p className="px-5 pb-5 text-body text-slate-700">{f.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
