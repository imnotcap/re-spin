import { Button } from '@respin/ui';
import { LazyBlurText } from '../LazyBits';
import { Reveal } from '../Reveal';

/** Afslutning på forsiden: opfordring til at sælge. */
export function Cta() {
  return (
    <section aria-labelledby="cta-title" className="mx-auto max-w-7xl px-4 pt-16 sm:px-6">
      <Reveal className="relative overflow-hidden rounded-xl bg-grad-deep px-6 py-12 text-center text-cream sm:px-12 sm:py-14">
        <div aria-hidden="true" className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-lime opacity-20 blur-3xl" />
        <h2 id="cta-title" className="relative text-h1 sm:text-[34px] sm:leading-[40px]">Har du tøj, du ikke bruger?</h2>
        {/* BlurText er et <p> – derfor brugt som undertekst, ikke i overskriften */}
        <LazyBlurText text="Det er gratis at sætte til salg. Du betaler kun 1 %, når det bliver solgt." className="relative mx-auto mt-3 max-w-xl justify-center text-[17px] leading-[26px] text-cream/85" />
        <div className="relative mt-7 flex flex-wrap justify-center gap-3">
          <Button href="/saelg/" size="lg" icon="plus">Sælg nu</Button>
          <Button href="/gebyrer/" size="lg" variant="ghost-inverse">Beregn din udbetaling</Button>
        </div>
      </Reveal>
    </section>
  );
}
