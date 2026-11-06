import { LazyCountUp } from '../LazyBits';
import { Reveal } from '../Reveal';

const STATS = [
  { to: 0, suffix: ' kr.', label: 'for at oprette en annonce' },
  { to: 48, suffix: ' timer', label: 'til at godkende varen, før pengene frigives' },
  { to: 8, suffix: '', label: 'billeder pr. annonce' },
  { to: 100, suffix: ' %', label: 'tilbage, hvis varen ikke er som beskrevet' }
];

export function Stats() {
  return (
    <section aria-label="Nøgletal" className="border-y border-line bg-surface">
      <Reveal className="mx-auto grid max-w-6xl grid-cols-2 gap-8 px-4 py-10 sm:px-6 md:grid-cols-4">
        {STATS.map((s) => (
          <div key={s.label} className="text-center">
            <p className="text-[36px] font-extrabold leading-[40px] tracking-[-0.02em] text-forest">
              <LazyCountUp to={s.to} suffix={s.suffix} />
            </p>
            <p className="mt-1 text-small text-muted">{s.label}</p>
          </div>
        ))}
      </Reveal>
    </section>
  );
}
