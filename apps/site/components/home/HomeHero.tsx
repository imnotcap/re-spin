import { Button } from '@respin/ui';
import { LazyRotatingText } from '../LazyBits';
import { bannerImage } from '../../lib/images';

/** Fotobanner med kort (som hos de store markedspladser). Mobil: foto øverst, kortet under. */
export function HomeHero() {
  const photo = bannerImage('hero');
  return (
    <section aria-labelledby="hero-title" className="mx-auto max-w-7xl sm:px-6 sm:pt-6">
      <div className="relative overflow-hidden bg-stone-100 sm:rounded-lg">
        <img
          src={photo.src}
          srcSet={photo.srcSet}
          sizes="(min-width: 1280px) 1232px, 100vw"
          alt=""
          width={1600}
          height={900}
          fetchPriority="high"
          decoding="async"
          className="block h-56 w-full object-cover sm:h-[360px] lg:h-[440px]"
        />
        <div className="relative border-b border-line bg-surface px-4 py-6 sm:absolute sm:left-8 sm:top-1/2 sm:w-[400px] sm:-translate-y-1/2 sm:rounded-md sm:border-0 sm:p-8 sm:shadow-float lg:left-12">
          {/* Overskriften er statisk HTML: vises med det samme og virker uden JS */}
          <h1 id="hero-title" className="text-[28px] font-bold leading-[34px] tracking-[-0.01em] sm:text-[32px] sm:leading-[38px]">
            Giv tøjet nyt liv
          </h1>
          {/* Det skiftende ord står sidst på linjen: ordets bredde flytter ingen anden tekst (CLS 0) */}
          <p className="mt-2 text-[17px] leading-[26px] text-slate-700">
            Find brugt{' '}
            <span className="font-semibold text-forest"><LazyRotatingText texts={['tøj', 'sneakers', 'tasker', 'boligting', 'børnetøj']} /></span>
          </p>
          <p className="mt-1 text-body text-muted">fra folk i hele Danmark – med køberbeskyttelse på alle køb.</p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Button href="/saelg/">Sælg nu</Button>
            <Button href="/saadan-virker-det/" variant="outline">Sådan virker det</Button>
          </div>
        </div>
      </div>
    </section>
  );
}
