import type { BadgeState } from '@respin/core/badges';
import { T } from '../../lib/i18n/client';
import { BadgeArt } from './BadgeArt';

/**
 * Badges som gitter af ens kort: tegningen øverst i midten, navn og beskrivelse under og (for låste) en
 * fremdriftslinje i bunden. Profilen viser kun de optjente; kontoen viser alle – de optjente først –
 * så man kan se, hvad der mangler (fx "3 / 10").
 */
export function BadgeList({ badges, showLocked = false }: { badges: readonly BadgeState[]; showLocked?: boolean }) {
  const list = showLocked ? [...badges].sort((a, b) => Number(b.earned) - Number(a.earned)) : badges.filter((b) => b.earned);
  if (!list.length) return <p className="text-body text-muted"><T k="profile.noBadges" /></p>;
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {list.map((b) => (
        <li key={b.id} className={`flex flex-col items-center rounded-lg border px-3 pb-4 pt-5 text-center ${b.earned ? 'border-line bg-surface' : 'border-line bg-sunken'}`}>
          <BadgeArt id={b.id} earned={b.earned} size={72} />
          <p className={`mt-3 text-small font-bold leading-tight ${b.earned ? 'text-ink' : 'text-slate-700'}`}><T k={`badge.${b.id}.name`} /></p>
          <p className="mt-1 text-caption leading-snug text-muted"><T k={`badge.${b.id}.desc`} /></p>
          {/* Fremdrift i bunden af kortet, så linjerne står ud for hinanden på tværs af rækken */}
          {!b.earned && b.goal > 1 && (
            <div className="mt-auto flex w-full items-center gap-2 pt-3" aria-label={`${b.progress} / ${b.goal}`}>
              <span className="h-1.5 flex-1 overflow-hidden rounded-pill bg-stone-200"><span className="block h-full rounded-pill bg-forest" style={{ width: `${Math.min(100, (b.progress / b.goal) * 100)}%` }} /></span>
              <span className="font-mono text-caption tabular-nums text-muted">{b.progress}/{b.goal}</span>
            </div>
          )}
          {b.earned && showLocked && <p className="mt-auto pt-3 text-caption font-semibold text-forest">Låst op</p>}
        </li>
      ))}
    </ul>
  );
}

/** Lille række med de optjente badges (fx under navnet på profilen og i sælgerboksen på annoncen) */
export function BadgeStrip({ badges }: { badges: readonly BadgeState[] }) {
  const earned = badges.filter((b) => b.earned);
  if (!earned.length) return null;
  return (
    <ul className="flex flex-wrap items-center gap-1.5" aria-label="Badges">
      {earned.map((b) => (
        <li key={b.id} className="inline-flex items-center gap-1.5 rounded-pill border border-line bg-surface py-0.5 pl-0.5 pr-2.5 text-caption font-semibold">
          <BadgeArt id={b.id} size={24} /><T k={`badge.${b.id}.name`} />
        </li>
      ))}
    </ul>
  );
}
