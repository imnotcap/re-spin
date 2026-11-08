import type { BadgeState } from '@respin/core/badges';
import { T } from '../../lib/i18n/client';
import { BadgeArt } from './BadgeArt';

/**
 * Badges som gitter. Profilen viser kun de optjente; kontoen viser alle med fremskridt mod de låste,
 * så man kan se, hvad der mangler (fx "3 / 10").
 */
export function BadgeList({ badges, showLocked = false }: { badges: readonly BadgeState[]; showLocked?: boolean }) {
  const list = showLocked ? badges : badges.filter((b) => b.earned);
  if (!list.length) return <p className="text-body text-muted"><T k="profile.noBadges" /></p>;
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {list.map((b) => (
        <li key={b.id} className={`flex items-center gap-3 rounded-lg border p-3 ${b.earned ? 'border-line bg-surface' : 'border-dashed border-line bg-sunken'}`}>
          <BadgeArt id={b.id} earned={b.earned} special={b.special} size={56} className="shrink-0" />
          <div className="min-w-0">
            <p className={`text-small font-bold ${b.earned ? 'text-ink' : 'text-slate-700'}`}><T k={`badge.${b.id}.name`} /></p>
            <p className="text-caption text-muted"><T k={`badge.${b.id}.desc`} /></p>
            {!b.earned && b.goal > 1 && (
              <div className="mt-1.5 flex items-center gap-2" aria-label={`${b.progress} / ${b.goal}`}>
                <span className="h-1.5 flex-1 overflow-hidden rounded-pill bg-stone-200"><span className="block h-full rounded-pill bg-forest" style={{ width: `${(b.progress / b.goal) * 100}%` }} /></span>
                <span className="font-mono text-caption tabular-nums text-muted">{b.progress}/{b.goal}</span>
              </div>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}

/** Lille række med de optjente badges (fx under navnet på profilen) */
export function BadgeStrip({ badges }: { badges: readonly BadgeState[] }) {
  const earned = badges.filter((b) => b.earned);
  if (!earned.length) return null;
  return (
    <ul className="flex flex-wrap items-center gap-1.5" aria-label="Badges">
      {earned.map((b) => (
        <li key={b.id} className="inline-flex items-center gap-1.5 rounded-pill border border-line bg-surface py-0.5 pl-0.5 pr-2.5 text-caption font-semibold">
          <BadgeArt id={b.id} special={b.special} size={24} /><T k={`badge.${b.id}.name`} />
        </li>
      ))}
    </ul>
  );
}
