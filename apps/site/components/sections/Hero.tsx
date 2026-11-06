import { Button, Icon } from '@respin/ui';
import { LazyRotatingText } from '../LazyBits';
import { HeroPhone } from './HeroPhone';

export function Hero() {
  return (
    <section aria-labelledby="hero-title" className="relative overflow-hidden">
      <div aria-hidden="true" className="pointer-events-none absolute -right-40 -top-40 h-[520px] w-[520px] rounded-full bg-grad-lime opacity-40 blur-3xl" />
      <div aria-hidden="true" className="pointer-events-none absolute -bottom-48 -left-40 h-[420px] w-[420px] rounded-full bg-grad-forest opacity-15 blur-3xl" />
      <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 pb-16 pt-12 sm:px-6 md:grid-cols-[1.1fr_0.9fr] md:pb-24 md:pt-20">
        <div>
          {/* Overskriften er statisk HTML: største element på siden vises med det samme (god LCP, virker uden JS) */}
          <h1 id="hero-title" className="text-[40px] font-extrabold leading-[44px] tracking-[-0.02em] sm:text-[56px] sm:leading-[60px]">
            Giv tøjet nyt liv.
            <br />
            <span className="text-forest">Sælg nemt, køb unikt.</span>
          </h1>
          {/* Det skiftende ord står sidst på sin egen linje: ordets bredde flytter ingen anden tekst (CLS 0) */}
          <p className="mt-5 text-[19px] font-semibold leading-[28px] text-slate-700 sm:text-[22px] sm:leading-[32px]">
            Find brugt{' '}
            <span className="font-extrabold text-ink"><LazyRotatingText texts={['tøj', 'sneakers', 'tasker', 'boligting', 'børnetøj']} /></span>
          </p>
          <p className="mt-3 max-w-xl text-[17px] leading-[27px] text-slate-700 sm:text-[19px] sm:leading-[30px]">
            Fra folk i hele Danmark. Gratis at oprette annoncer, og køberbeskyttelse på alle køb.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button href="/#demo" size="lg" iconRight="arrow">Prøv demoen</Button>
            <Button href="/gebyrer/" size="lg" variant="outline">Se gebyrerne</Button>
          </div>
          <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-small text-slate-700">
            <li className="flex items-center gap-2"><Icon name="shield" size={18} /> Køberbeskyttelse</li>
            <li className="flex items-center gap-2"><Icon name="lock" size={18} /> Log ind med passkey</li>
            <li className="flex items-center gap-2"><Icon name="tag" size={18} /> 0 kr. for at oprette</li>
          </ul>
        </div>
        <HeroPhone />
      </div>
    </section>
  );
}
