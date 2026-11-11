import type { ReactNode } from 'react';
import { Avatar, CertifiedBadge, Icon, type IconName } from '@respin/ui';
import { T } from '../../lib/i18n/client';
import type { Banner } from '../../lib/banners';
import { ShareButton } from './ShareButton';
import { ProfileTabs, type ProfileTab } from './ProfileTabs';

export interface Review { id: string; author: string; rating: 1 | 2 | 3 | 4 | 5; daysAgo: number; text: string; itemTitle?: string }

export interface ProfileFact { icon: IconName; label: ReactNode; value: ReactNode; /** Teksten før tallet (fx "medlem siden 2026") */ labelFirst?: boolean }

/** Banner (foto eller farve) */
export function BannerArt({ banner, className = '', priority = true }: { banner: Banner; className?: string; /** Øverst på siden: hent med det samme */ priority?: boolean }) {
  return banner.photo ? (
    <img src={banner.photo.src} srcSet={banner.photo.srcSet} sizes={banner.photo.srcSet ? '(min-width: 1280px) 1232px, 100vw' : undefined} alt="" width={1600} height={400}
      fetchPriority={priority ? 'high' : undefined} loading={priority ? undefined : 'lazy'} className={`h-full w-full object-cover ${className}`} />
  ) : (
    <span aria-hidden="true" className={`block h-full w-full ${banner.className} ${className}`} />
  );
}

const stars = (v: number) => (
  <span className="inline-flex text-amber-500" aria-hidden="true">
    {[1, 2, 3, 4, 5].map((i) => <Icon key={i} name="star" size={16} className={i <= Math.round(v) ? '' : 'opacity-25'} />)}
  </span>
);

/**
 * Profilens top: banner, avatar oven på banneret, og én række med navn, nøgletal og "Del profil" på samme linje
 * (på mobil under hinanden). Badges og beskrivelse står under navnet.
 */
export function ProfileHeader({ name, handle, banner, avatarSrc, certified, rating, reviews, facts, bio, sharePath, extra }: {
  name: string; handle: string; banner: Banner; avatarSrc?: string | null; certified?: boolean; rating?: number; reviews?: number; facts: ProfileFact[]; bio?: string; sharePath: string;
  /** Fx badges – vises under navnet */
  extra?: ReactNode;
}) {
  return (
    <header className="mt-5 overflow-hidden rounded-xl border border-line bg-surface">
      <div className="h-36 bg-stone-100 sm:h-56">
        <BannerArt banner={banner} />
      </div>
      <div className="px-5 pb-6 sm:px-8 sm:pb-7">
        <div className="flex items-end justify-between gap-4">
          <Avatar name={name} src={avatarSrc ?? undefined} size="xl" className="-mt-12 shrink-0 ring-4 ring-white sm:-mt-16" />
          <div className="pb-0.5 sm:hidden"><ShareButton path={sharePath} title={name} /></div>
        </div>
        <div className="mt-3 flex items-start justify-between gap-6">
          <div className="min-w-0">
            <h1 className="flex flex-wrap items-center gap-x-3 gap-y-1 break-words text-[28px] font-extrabold leading-tight tracking-[-0.02em] sm:text-[36px]">
              <span className="min-w-0">{name}</span>
              {certified && <CertifiedBadge />}
            </h1>
            <p className="text-body text-muted">@{handle}</p>
            {/* Nøgletal i én linje: "2 til salg · 3 badges · …" */}
            <dl className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-body">
              {facts.map((f, i) => (
                <div key={i} className={`flex items-baseline gap-1.5 ${f.labelFirst ? '' : 'flex-row-reverse justify-end'}`}>
                  <dt className="text-muted">{f.label}</dt>
                  <dd className="font-extrabold tabular-nums text-ink">{f.value}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div className="hidden shrink-0 pt-1.5 sm:block"><ShareButton path={sharePath} title={name} /></div>
        </div>

        {rating !== undefined && reviews !== undefined && reviews > 0 && (
          <a href="#anmeldelser" className="mt-4 inline-flex items-center gap-2 rounded-sm text-small hover:underline">
            {stars(rating)}
            <b className="text-body">{rating.toLocaleString('da-DK', { minimumFractionDigits: 1 })}</b>
            <span className="text-muted"><T k="profile.reviewsCount" v={{ n: reviews }} /></span>
          </a>
        )}
        {extra && <div className="mt-5">{extra}</div>}
        {bio && <p className="mt-4 max-w-3xl whitespace-pre-line text-body text-slate-700">{bio}</p>}
        {certified && <p className="mt-3 flex items-start gap-2 text-small text-muted"><Icon name="shield" size={16} className="mt-0.5 shrink-0 text-forest" /><T k="profile.certifiedText" /></p>}
      </div>
    </header>
  );
}

/** Anmeldelser: gennemsnit og fordeling til venstre, de nyeste anmeldelser til højre */
export function ReviewsPanel({ name, rating, count, distribution, reviews }: {
  name: string; rating: number; count: number; distribution: [number, number, number, number, number]; reviews: Review[];
}) {
  if (count === 0) {
    return (
      <div className="rounded-lg border border-dashed border-line p-8 text-center">
        <p className="text-h3"><T k="profile.noReviews" /></p>
        <p className="mt-1 text-body text-muted"><T k="profile.noReviewsText" v={{ name }} /></p>
      </div>
    );
  }
  const max = Math.max(...distribution, 1);
  return (
    <div className="grid gap-8 lg:grid-cols-[280px_minmax(0,1fr)]">
      <div className="self-start rounded-lg border border-line p-5">
        <p className="flex items-baseline gap-2"><span className="text-[44px] font-bold leading-none">{rating.toLocaleString('da-DK', { minimumFractionDigits: 1 })}</span><span className="text-muted"><T k="profile.outOf5" /></span></p>
        <div className="mt-2">{stars(rating)}</div>
        <p className="mt-1 text-small text-muted"><T k="profile.reviewsCount" v={{ n: count }} /></p>
        <ul className="mt-4 space-y-1.5">
          {distribution.map((c, i) => (
            <li key={i} className="flex items-center gap-2 text-small">
              <span className="w-3 text-right font-semibold">{5 - i}</span>
              <Icon name="star" size={14} className="text-amber-500" />
              <span className="h-2 flex-1 overflow-hidden rounded-full bg-stone-100"><span className="block h-full rounded-full bg-forest" style={{ width: `${(c / max) * 100}%` }} /></span>
              <span className="w-8 text-right tabular-nums text-muted">{c}</span>
              <span className="sr-only">{5 - i === 1 ? <T k="profile.starOne" /> : <T k="profile.stars" v={{ n: 5 - i }} />}</span>
            </li>
          ))}
        </ul>
      </div>
      <div>
        <ul className="divide-y divide-line">
          {reviews.map((r) => (
            <li key={r.id} className="py-4 first:pt-0">
              <div className="flex items-center gap-3">
                <Avatar name={r.author} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{r.author}</p>
                  <p className="flex items-center gap-2 text-caption text-muted">
                    <span role="img" aria-label={`${r.rating}/5`}>{stars(r.rating)}</span>
                    <span>{r.daysAgo <= 0 ? <T k="time.today" /> : r.daysAgo === 1 ? <T k="time.yesterday" /> : <T k="time.daysAgo" v={{ n: r.daysAgo }} />}</span>
                  </p>
                </div>
              </div>
              <p className="mt-2 text-body text-slate-700">{r.text}</p>
              {r.itemTitle && <p className="mt-1 text-caption text-muted"><T k="profile.bought" v={{ item: r.itemTitle }} /></p>}
            </li>
          ))}
        </ul>
        {count > reviews.length && <p className="mt-2 text-small text-muted"><T k="profile.showingLatest" v={{ shown: reviews.length, n: count }} /></p>}
      </div>
    </div>
  );
}

export { ProfileTabs, type ProfileTab };
