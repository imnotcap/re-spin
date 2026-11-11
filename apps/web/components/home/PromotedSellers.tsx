import Link from 'next/link';
import { Avatar, CertifiedBadge, Icon, SectionHeader } from '@respin/ui';
import type { PromotedSeller } from '../../lib/promotions';
import { profilePath } from '../../lib/profile-url';

/**
 * «Fremhævede sælgere» på forsiden: sælgere, der har købt profilfremhævning. Hvert kort viser navn, mærker,
 * de nyeste varer og linker til profilen. Mærket «Fremhævet» gør det tydeligt, at pladsen er betalt.
 */
export function PromotedSellers({ sellers, className = '' }: { sellers: readonly PromotedSeller[]; className?: string }) {
  if (!sellers.length) return null;
  return (
    <section aria-labelledby="fremhaevede-saelgere" className={className}>
      <SectionHeader id="fremhaevede-saelgere" title="Fremhævede sælgere" className="mb-4 px-0" />
      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {sellers.map((s) => {
          const href = s.username ? profilePath(s.username) : null;
          const body = (
            <>
              <div className="flex items-center gap-3">
                <Avatar name={s.name} src={s.avatar ?? undefined} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{s.name}</p>
                  <p className="text-small text-muted">{s.count === 1 ? '1 vare til salg' : `${s.count} varer til salg`}</p>
                </div>
                <span className="shrink-0 rounded-pill bg-lime/60 px-2 py-0.5 text-caption font-bold text-forest">Fremhævet</span>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-1.5">
                {[0, 1, 2].map((i) => s.images[i]
                  ? <img key={i} src={s.images[i]} alt="" width={120} height={120} loading="lazy" decoding="async" className="aspect-square w-full rounded-md bg-stone-100 object-cover" />
                  : <span key={i} className="flex aspect-square w-full items-center justify-center rounded-md bg-stone-100 text-slate-400"><Icon name="tag" size={18} /></span>)}
              </div>
              <div className="mt-3 flex items-center justify-between gap-2">
                {s.certified ? <CertifiedBadge /> : <span />}
                {href && <span className="inline-flex items-center gap-1 text-small font-semibold text-forest">Se profil<Icon name="arrow" size={16} /></span>}
              </div>
            </>
          );
          return (
            <li key={s.id} data-track="home_promoted_seller">
              {href
                ? <Link href={href} className="block h-full rounded-lg border border-line bg-surface p-4 transition-colors hover:border-slate">{body}</Link>
                : <div className="h-full rounded-lg border border-line bg-surface p-4">{body}</div>}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
