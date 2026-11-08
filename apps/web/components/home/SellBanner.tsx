import { Button, Icon } from '@respin/ui';
import { bannerImage } from '../../lib/images';
import { T } from '../../lib/i18n/client';

const POINTS = ['sellBanner.p1', 'sellBanner.p2', 'sellBanner.p3'];

/** Split-banner: foto til venstre, budskab til højre. */
export function SellBanner() {
  const photo = bannerImage('saelg');
  return (
    <section aria-labelledby="saelg-title" className="mx-auto mt-16 max-w-7xl px-4 sm:px-6">
      <div className="grid grid-cols-1 overflow-hidden rounded-lg bg-cream-200 md:grid-cols-2">
        <img src={photo.src} srcSet={photo.srcSet} sizes="(min-width: 768px) 50vw, 100vw" alt="" width={1200} height={900} loading="lazy" decoding="async"
          className="block h-60 w-full object-cover md:h-full md:min-h-[360px]" />
        <div className="flex flex-col justify-center px-6 py-8 sm:px-10 lg:px-14">
          <h2 id="saelg-title" className="text-[26px] font-bold leading-[32px]"><T k="sellBanner.title" /></h2>
          <p className="mt-2 text-body text-slate-700"><T k="sellBanner.text" /></p>
          <ul className="mt-5 space-y-2.5">
            {POINTS.map((p) => (
              <li key={p} className="flex gap-2.5 text-body"><Icon name="check" size={20} className="mt-0.5 shrink-0 text-forest" /><T k={p} /></li>
            ))}
          </ul>
          <div className="mt-7 flex flex-wrap gap-2">
            <Button href="/saelg/ny/" data-track="banner_sell"><T k="header.sell" /></Button>
            <Button href="/gebyrer/" variant="outline"><T k="sellBanner.calc" /></Button>
          </div>
        </div>
      </div>
    </section>
  );
}
