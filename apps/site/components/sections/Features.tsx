import { Badge, Icon } from '@respin/ui';
import { FEATURES } from '../../lib/content';
import { SpotlightCard } from '../rb';
import { Reveal } from '../Reveal';
import { SectionHeading } from '../SectionHeading';

export function Features() {
  return (
    <section aria-labelledby="features-title" className="mx-auto max-w-7xl px-4 pt-16 sm:px-6">
      <SectionHeading id="features-title" eyebrow="Tryghed først" title="Bygget til at handle trygt" intro="Sikkerheden er tænkt ind fra starten – ikke klistret på bagefter." />
      <ul className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((f, i) => (
          <li key={f.title} className="h-full">
            <Reveal delay={(i % 3) * 80} className="h-full">
              <SpotlightCard theme="light" spotlightColor="rgba(14, 90, 47, 0.22)" className="h-full rounded-lg p-6">
                <div className="flex items-start justify-between gap-3">
                  <span className="inline-flex h-11 w-11 items-center justify-center rounded-md bg-sunken text-forest"><Icon name={f.icon} size={22} /></span>
                  {f.status && <Badge tone="soft">{f.status}</Badge>}
                </div>
                <h3 className="mt-5 text-h3">{f.title}</h3>
                <p className="mt-2 text-body text-slate-700">{f.text}</p>
              </SpotlightCard>
            </Reveal>
          </li>
        ))}
      </ul>
    </section>
  );
}
