import Link from 'next/link';
import { Avatar } from '@respin/ui';
import type { MemberHit } from '../../lib/profile';
import { profilePath } from '../../lib/profile-url';

/** Personer, der matcher søgningen – vandret række over annoncerne (kan scrolles på mobil) */
export function PeopleResults({ people, q }: { people: MemberHit[]; q: string }) {
  if (!people.length) return null;
  return (
    <section aria-labelledby="personer" className="mt-4">
      <h2 id="personer" className="text-small font-bold uppercase tracking-[0.08em] text-muted">Personer, der matcher “{q}”</h2>
      <ul className="-mx-4 mt-3 flex gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0 [&::-webkit-scrollbar]:hidden">
        {people.map((p) => (
          <li key={p.username} className="shrink-0">
            <Link href={profilePath(p.username)} data-track="search_person"
              className="flex w-56 items-center gap-3 rounded-xl border border-line bg-surface p-3 transition-colors hover:border-slate">
              <Avatar name={p.name} src={p.avatar ?? undefined} />
              <span className="min-w-0">
                <span className="block truncate font-semibold">{p.name}</span>
                <span className="block truncate text-caption text-muted">@{p.username} · {p.forSale === 1 ? '1 til salg' : `${p.forSale} til salg`}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
