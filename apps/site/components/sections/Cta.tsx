import { Button } from '@respin/ui';
import { LazyBlurText } from '../LazyBits';
import { Reveal } from '../Reveal';

export function Cta() {
  return (
    <section aria-labelledby="cta-title" className="mx-auto max-w-6xl px-4 pt-24 sm:px-6">
      <Reveal className="relative overflow-hidden rounded-xl bg-grad-deep px-6 py-14 text-center text-cream sm:px-12">
        <div aria-hidden="true" className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-lime opacity-20 blur-3xl" />
        <h2 id="cta-title" className="relative text-h1 sm:text-[38px] sm:leading-[44px]">Klar til at give tøjet nyt liv?</h2>
        {/* BlurText er et <p> – derfor brugt som undertekst, ikke i overskriften */}
        <LazyBlurText text="Appen er under udvikling. Prøv demoen eller regn på, hvad du kan få for dine ting." className="relative mx-auto mt-4 max-w-xl justify-center text-[17px] leading-[26px] text-cream/85" />
        <div className="relative mt-8 flex flex-wrap justify-center gap-3">
          <Button href="/#demo" size="lg">Prøv demoen</Button>
          <Button href="/gebyrer/" size="lg" variant="ghost-inverse">Beregn din pris</Button>
        </div>
      </Reveal>
    </section>
  );
}
