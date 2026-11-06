import { Button } from '@respin/ui';
import { Reveal } from '../Reveal';
import { SectionHeading } from '../SectionHeading';

const CARDS = [
  { big: '0 kr.', title: 'At oprette en annonce', text: 'Læg så mange varer op, du vil.' },
  { big: '1 %', title: 'Når du sælger', text: 'Kun 0,5 % for certificerede sælgere.' },
  { big: '5 % + 3 kr.', title: 'Køberbeskyttelse', text: 'Betales af køber og dækker hele handlen.' }
];

export function FeesTeaser() {
  return (
    <section aria-labelledby="fees-title" className="mx-auto max-w-7xl px-4 pt-16 sm:px-6">
      <SectionHeading id="fees-title" eyebrow="Gebyrer" title="Enkle priser – ingen overraskelser" />
      <ul className="mt-10 grid gap-5 md:grid-cols-3">
        {CARDS.map((c, i) => (
          <li key={c.title}>
            <Reveal delay={i * 80} className="h-full rounded-lg border border-line bg-surface p-6 shadow-line">
              <p className="text-[34px] font-extrabold leading-[40px] tracking-[-0.02em] text-forest">{c.big}</p>
              <h3 className="mt-2 text-h3">{c.title}</h3>
              <p className="mt-1 text-body text-slate-700">{c.text}</p>
            </Reveal>
          </li>
        ))}
      </ul>
      <div className="mt-8 text-center"><Button href="/gebyrer/" variant="outline" iconRight="arrow">Beregn din pris</Button></div>
    </section>
  );
}
