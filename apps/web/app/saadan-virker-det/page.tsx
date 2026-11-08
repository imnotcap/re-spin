import type { Metadata } from 'next';
import { pageMetadata } from '../../lib/seo';
import Link from 'next/link';
import { Accordion, Breadcrumbs, Button, StepList } from '@respin/ui';
import { FAQ, STEPS } from '../../lib/content';
import { bannerImage } from '../../lib/images';
import { T } from '../../lib/i18n/client';
import { formatOre, ore } from '@respin/core/money';
import { PROMOTION_PACKAGES } from '@respin/core/promotions';

export const metadata: Metadata = pageMetadata({ title: 'Sådan virker det', description: 'Sådan køber og sælger du på Videro: tre trin, gebyrer, køberbeskyttelse og svar på de mest stillede spørgsmål.', path: '/saadan-virker-det/' });

const FEES = [
  ['At sætte en vare til salg', 'Sælger', 'Gratis'],
  ['Kommission, når varen er solgt', 'Sælger', '0 % – du får hele prisen'],
  ['Fremhæv annonce (valgfrit)', 'Sælger', `Fra ${formatOre(ore(Math.min(...PROMOTION_PACKAGES.map((p) => p.priceOre))))}`],
  ['Køberbeskyttelse', 'Køber', '5 % + 3 kr.'],
  ['Fragt', 'Køber', 'Fra 39 kr.']
] as const;

const section = 'grid grid-cols-1 gap-6 border-t border-line py-12 md:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)] md:gap-12 md:py-16';

export default function HowPage() {
  const photo = bannerImage('butik');
  return (
    <div className="mx-auto max-w-7xl px-4 pt-5 sm:px-6">
      <Breadcrumbs items={[{ label: <T k="crumb.home" />, href: '/' }, { label: 'Sådan virker det' }]} />

      <header className="grid grid-cols-1 items-center gap-8 pb-12 pt-6 md:grid-cols-2 md:gap-12 md:pb-16">
        <div>
          <h1 className="text-[32px] font-bold leading-[38px] tracking-[-0.01em] sm:text-[40px] sm:leading-[46px]">Sådan virker Videro</h1>
          <p className="mt-3 max-w-lg text-[17px] leading-[27px] text-slate-700">
            Sæt dit tøj til salg gratis, og køb trygt fra folk i hele Danmark. Her er hele forklaringen – også det med småt.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            <Button href="/saelg/">Sælg nu</Button>
            <Button href="/soeg/" variant="outline">Se varerne</Button>
          </div>
        </div>
        <img src={photo.src} srcSet={photo.srcSet} sizes="(min-width: 768px) 50vw, 100vw" alt="" width={1200} height={900}
          decoding="async" className="aspect-[4/3] w-full rounded-lg object-cover" />
      </header>

      <section aria-labelledby="saelg" className={section}>
        <div>
          <h2 id="saelg" className="text-[24px] font-bold leading-[30px]">Sådan sælger du</h2>
          <p className="mt-2 text-body text-muted">Fra skab til solgt på få minutter.</p>
        </div>
        <StepList steps={STEPS.seller} />
      </section>

      <section aria-labelledby="koeb" className={section}>
        <div>
          <h2 id="koeb" className="text-[24px] font-bold leading-[30px]">Sådan køber du</h2>
          <p className="mt-2 text-body text-muted">Find dit fund, og køb med køberbeskyttelse.</p>
        </div>
        <StepList steps={STEPS.buyer} />
      </section>

      <section aria-labelledby="gebyrer" className={section}>
        <div>
          <h2 id="gebyrer" className="text-[24px] font-bold leading-[30px]">Gebyrer</h2>
          <p className="mt-2 text-body text-muted">Ingen abonnement og ingen skjulte gebyrer. Køber ser altid den hele pris.</p>
        </div>
        <div>
          <table className="w-full border-collapse text-left text-body">
            <caption className="sr-only">Gebyrer på Videro</caption>
            <thead>
              <tr className="border-b border-slate text-small text-muted">
                <th scope="col" className="py-3 pr-4 font-semibold">Hvad</th>
                <th scope="col" className="hidden py-3 pr-4 font-semibold sm:table-cell">Hvem betaler</th>
                <th scope="col" className="py-3 text-right font-semibold">Pris</th>
              </tr>
            </thead>
            <tbody>
              {FEES.map(([what, who, price]) => (
                <tr key={what} className="border-b border-line">
                  <th scope="row" className="py-4 pr-4 font-normal">
                    {what}
                    <span className="block text-small text-muted sm:hidden">Betales af {who.toLowerCase()}</span>
                  </th>
                  <td className="hidden py-4 pr-4 text-slate-700 sm:table-cell">{who}</td>
                  <td className="py-4 text-right font-semibold">{price}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-4 text-body">
            <Link href="/gebyrer/" className="font-semibold text-forest underline underline-offset-4">Beregn præcist, hvad køber betaler, og hvad du får udbetalt</Link>
          </p>
        </div>
      </section>

      <section aria-labelledby="beskyttelse" className={section}>
        <div>
          <h2 id="beskyttelse" className="text-[24px] font-bold leading-[30px]">Køberbeskyttelse</h2>
          <p className="mt-2 text-body text-muted">Med på alle køb, der betales i appen.</p>
        </div>
        <div className="max-w-2xl space-y-4 text-body text-slate-700">
          <p>Når du køber, holder vi pengene. Sælger får dem først, når du har modtaget varen og godkendt den – eller automatisk 48 timer efter levering, hvis du ikke melder et problem.</p>
          <p>Kommer varen ikke frem, eller er den ikke som beskrevet, får du alle pengene tilbage. Betaler du uden om appen, fx med MobilePay direkte til sælger, er du ikke dækket.</p>
          <p><Link href="/sikkerhed/" className="font-semibold text-forest underline underline-offset-4">Læs mere om tryghed og sikkerhed</Link></p>
        </div>
      </section>

      <section id="faq" aria-labelledby="faq-title" className={`${section} scroll-mt-24`}>
        <div>
          <h2 id="faq-title" className="text-[24px] font-bold leading-[30px]">Spørgsmål og svar</h2>
        </div>
        <Accordion items={FAQ.map((f) => ({ title: f.q, content: <p>{f.a}</p> }))} />
      </section>
    </div>
  );
}
