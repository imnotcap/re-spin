import type { ReactNode } from 'react';
import { Avatar, CertifiedBadge, Icon, type IconName } from '@respin/ui';
import { T } from '../../lib/i18n/client';
import type { Banner } from '../../lib/banners';
import { ShareButton } from './ShareButton';
import { ProfileTabs, type ProfileTab } from './ProfileTabs';

export interface Review { id: string; author: string; rating: 1 | 2 | 3 | 4 | 5; daysAgo: number; text: string; itemTitle?: string }

export interface ProfileFact { icon: IconName; label: ReactNode; value: ReactNode }

/** Banner (foto eller farve) */
export function BannerArt({ banner, className = '' }: { banner: Banner; className?: string }) {
  return banner.photo ? (
    <img src={banner.photo.src} srcSet={banner.photo.srcSet} sizes="(min-width: 1280px) 1232px, 100vw" alt="" width={1600} height={400}
      fetchPriority="high" className={`h-full w-full object-cover ${className}`} />
  ) : (
    <span aria-hidden="true" className={`block h-full w-full ${banner.className} ${className}`} />
  );
}

const stars = (v: number) => (
  <span className="inline-flex text-amber-500" aria-hidden="true">
    {[1, 2, 3, 4, 5].map((i) => <Icon key={i} name="star" size={16} className={i <= Math.round(v) ? '' : 'opacity-25'} />)}
  </span>
);

/** Profilens top: banner, avatar oven på banneret, navn, vurdering, mærker, fakta og bio */
export function ProfileHeader({ name, handle, banner, certified, rating, reviews, facts, bio, sharePath }: {
  name: string; handle: string; banner: Banner; certified?: boolean; rating?: number; reviews?: number; facts: ProfileFact[]; bio?: string; sharePath: string;
}) {
  return (
    <header className="mt-5 overflow-hidden rounded-xl border border-line bg-surface">
      <div className="h-32 bg-stone-100 sm:h-48">
        <BannerArt banner={banner} />
      </div>
      <div className="px-5 pb-6 sm:px-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <Avatar name={name} size="xl" className="-mt-12 ring-4 ring-white sm:-mt-14" />
          <ShareButton path={sharePath} title={name} />
        </div>
        <div className="mt-3">
          <h1 className="break-words text-h1 leading-tight">{name}</h1>
          <p className="text-body text-muted">@{handle}</p>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
          {rating !== undefined && reviews !== undefined && reviews > 0 && (
            <a href="#anmeldelser" className="inline-flex items-center gap-2 rounded-sm text-small hover:underline">
              {stars(rating)}
              <b className="text-body">{rating.toLocaleString('da-DK', { minimumFractionDigits: 1 })}</b>
              <span className="text-muted"><T k="profile.reviewsCount" v={{ n: reviews }} /></span>
            </a>
          )}
          {certified && <CertifiedBadge />}
        </div>

        <dl className="mt-5 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-line bg-line lg:grid-cols-4">
          {facts.map((f, i) => (
            <div key={i} className="relative min-w-0 bg-surface p-4 pl-16">
              <dt className="text-caption text-muted">
                <span aria-hidden="true" className="absolute left-4 top-4 flex h-9 w-9 items-center justify-center rounded-md bg-stone-100 text-forest"><Icon name={f.icon} size={18} /></span>
                {f.label}
              </dt>
              <dd className="font-semibold">{f.value}</dd>
            </div>
          ))}
        </dl>

        {bio && <p className="mt-5 max-w-3xl whitespace-pre-line text-body text-slate-700">{bio}</p>}
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
