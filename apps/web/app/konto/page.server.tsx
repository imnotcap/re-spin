import Link from 'next/link';
import { Avatar, Button, Icon, Notice } from '@respin/ui';
import { AuthPage } from '../../components/AuthPage';
import { ChangePasswordForm } from '../../components/AuthForms';
import { getAuth, requireSession } from '../../lib/auth';
import { revokeSessionAction, signOutAction, signOutOthersAction } from '../../lib/actions';
import { T } from '../../lib/i18n/client';
import { getDb } from '../../lib/server';
import { ensureUsername, profileFor } from '../../lib/profile';
import { isBannerId, DEFAULT_BANNER } from '../../lib/banners';
import { profilePath } from '../../lib/profile-url';
import { BASE_PATH } from '../../lib/site';
import { ProfileForm } from '../../components/profile/ProfileForm';
import { unreadCountForUser } from '@respin/support';
import { warningsFor } from '../../lib/listings';
import { badgesFor } from '../../lib/badges';
import { BadgeList } from '../../components/badges/BadgeList';
import { unreadConversations } from '../../lib/conversations';
import { activeProfilePromotion } from '../../lib/promotions';
import { ordersNeedingAction } from '../../lib/orders';
import { payoutStatus } from '../../lib/payouts';

export const metadata = { title: 'Min konto' };

const fmt = (d: Date) => d.toLocaleString('da-DK', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Europe/Copenhagen' });
const device = (ua: string | null) => (ua ? (/(iPhone|iPad|Android|Macintosh|Windows|Linux)/.exec(ua)?.[1] ?? 'Ukendt enhed') : 'Ukendt enhed');
const h2 = 'text-[20px] font-bold leading-[26px]';

export default async function AccountPage({ searchParams }: { searchParams: Promise<{ welcome?: string; others?: string; profil_fremhaevet?: string }> }) {
  const current = await requireSession('/konto/');
  const sp = await searchParams;
  const list = await getAuth().listSessions(current.user.id);
  const username = await ensureUsername(getDb(), current.user.id);
  const profile = await profileFor(getDb(), current.user.id);
  const unread = await unreadCountForUser(getDb(), current.user.id);
  const warnings = await warningsFor(getDb(), current.user.id).catch(() => []);
  const badges = await badgesFor(getDb(), current.user.id).catch(() => []);
  const unreadChats = await unreadConversations(getDb(), current.user.id).catch(() => 0);
  const profilePromoted = await activeProfilePromotion(getDb(), current.user.id).catch(() => null);
  const orderTodo = await ordersNeedingAction(getDb(), current.user.id).catch(() => 0);
  const payout = await payoutStatus(getDb(), current.user.id).catch(() => null);
  return (
    <AuthPage width="page" title="Min konto" crumbs={[{ label: <T k="crumb.home" />, href: '/' }, { label: 'Min konto' }]}>
      {sp.welcome && <Notice icon="check" role="status">Din e-mail er bekræftet. Velkommen til Videro!</Notice>}
      {sp.others && <Notice icon="check" role="status">Du er logget ud på alle andre enheder.</Notice>}
      {sp.profil_fremhaevet && <Notice icon="check" role="status">Din profil er fremhævet. Den vises nu under «Fremhævede sælgere» på forsiden.</Notice>}

      {warnings.length > 0 && (
        <section aria-labelledby="advarsler" className={`rounded-lg border p-5 ${warnings.some((w) => w.isNew) ? 'border-red-300 bg-red-50' : 'border-line'}`}>
          <h2 id="advarsler" className={h2}>{warnings.length === 1 ? 'Du har fået en advarsel fra Videro' : `Du har fået ${warnings.length} advarsler fra Videro`}</h2>
          <p className="mt-1 text-small text-slate-700">Advarsler gives, når en annonce eller besked bryder <Link href="/vilkaar/" className="font-semibold underline underline-offset-2">reglerne</Link>. Gentagne brud kan føre til, at kontoen bliver spærret.</p>
          <ul className="mt-3 flex flex-col gap-3">
            {warnings.map((w) => (
              <li key={w.id} className="rounded-md border border-line bg-surface p-3">
                <p className="text-small font-semibold">{w.reasonLabel}{w.listingTitle ? ` · ${w.listingTitle}` : ''}{w.isNew && <span className="ml-2 rounded-pill bg-coral-600 px-2 py-0.5 text-caption font-bold text-white">Ny</span>}</p>
                <p className="mt-1 whitespace-pre-line text-small text-slate-700">{w.message}</p>
                <p className="mt-1 text-caption text-muted">{fmt(w.createdAt)} · Spørgsmål? <Link href="/konto/support/ny/" className="underline underline-offset-2">Skriv til kundeservice</Link></p>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="flex items-center gap-4">
        <Avatar name={current.user.displayName} size="lg" />
        <div className="min-w-0">
          <p className="truncate text-[18px] font-semibold">{current.user.displayName}</p>
          <p className="truncate text-body text-muted">{current.user.email}</p>
        </div>
      </div>

      <section aria-labelledby="profil" className="rounded-lg border border-line p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 id="profil" className={h2}>Din profil</h2>
            <p className="text-small text-muted">Det, andre ser, når de klikker på dit navn.</p>
          </div>
          <a href={`${BASE_PATH}${profilePath(username)}`} className="inline-flex items-center gap-1.5 text-small font-semibold text-forest underline underline-offset-4">Se din profil<Icon name="arrow" size={16} /></a>
        </div>
        <div className="mt-4">
          <ProfileForm username={username} bio={profile?.bio ?? ''} banner={isBannerId(profile?.banner) ? profile.banner : DEFAULT_BANNER} />
        </div>
      </section>

      {badges.length > 0 && (
        <section aria-labelledby="badges" className="rounded-lg border border-line p-5">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="badges" className={h2}>Dine badges</h2>
            <span className="text-small text-muted">{badges.filter((b) => b.earned).length} af {badges.length} låst op · de optjente vises på din profil</span>
          </div>
          <div className="mt-4"><BadgeList badges={badges} showLocked /></div>
        </section>
      )}

      <Link href="/konto/ordrer/" className="flex items-center gap-4 rounded-lg border border-line p-4 transition-colors hover:border-slate">
        <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-stone-100 text-forest">
          <Icon name="bag" size={20} />
          {orderTodo > 0 && <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full border-2 border-surface bg-coral-600" aria-hidden="true" />}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-semibold">Køb og salg</span>
          <span className="block text-small text-muted">{orderTodo > 0 ? (orderTodo === 1 ? '1 ordre venter på dig' : `${orderTodo} ordrer venter på dig`) : 'Følg dine køb, og send dine solgte varer'}</span>
        </span>
        <Icon name="next" size={20} className="text-muted" />
      </Link>

      <Link href="/konto/udbetalinger/" className="flex items-center gap-4 rounded-lg border border-line p-4 transition-colors hover:border-slate">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-stone-100 text-forest"><Icon name="wallet" size={20} /></span>
        <span className="min-w-0 flex-1">
          <span className="block font-semibold">Udbetalinger</span>
          <span className="block text-small text-muted">{payout?.payoutsEnabled ? 'Udbetalingskonto godkendt' : payout?.hasAccount ? 'Udbetalingskonto mangler oplysninger' : 'Opret udbetalingskonto og bekræft din identitet'}</span>
        </span>
        <Icon name="next" size={20} className="text-muted" />
      </Link>

      <Link href="/konto/beskeder/" className="flex items-center gap-4 rounded-lg border border-line p-4 transition-colors hover:border-slate">
        <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-stone-100 text-forest">
          <Icon name="chat" size={20} />
          {unreadChats > 0 && <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full border-2 border-surface bg-coral-600" aria-hidden="true" />}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-semibold">Beskeder og bud</span>
          <span className="block text-small text-muted">{unreadChats > 0 ? (unreadChats === 1 ? '1 samtale med nye beskeder' : `${unreadChats} samtaler med nye beskeder`) : 'Dine samtaler med købere og sælgere'}</span>
        </span>
        <Icon name="next" size={20} className="text-muted" />
      </Link>

      <Link href="/konto/annoncer/" className="flex items-center gap-4 rounded-lg border border-line p-4 transition-colors hover:border-slate">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-stone-100 text-forest"><Icon name="tag" size={20} /></span>
        <span className="min-w-0 flex-1">
          <span className="block font-semibold">Mine annoncer</span>
          <span className="block text-small text-muted">Sæt til salg, redigér, markér som solgt</span>
        </span>
        <Icon name="next" size={20} className="text-muted" />
      </Link>

      <Link href="/konto/fremhaev-profil/" className="flex items-center gap-4 rounded-lg border border-line p-4 transition-colors hover:border-slate">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-stone-100 text-forest"><Icon name="sparkle" size={20} /></span>
        <span className="min-w-0 flex-1">
          <span className="block font-semibold">Fremhæv din profil</span>
          <span className="block text-small text-muted">{profilePromoted ? `Fremhævet til ${profilePromoted.toLocaleDateString('da-DK', { day: 'numeric', month: 'long', timeZone: 'Europe/Copenhagen' })}` : 'Bliv vist under «Fremhævede sælgere» på forsiden'}</span>
        </span>
        <Icon name="next" size={20} className="text-muted" />
      </Link>

      <Link href="/konto/support/" className="flex items-center gap-4 rounded-lg border border-line p-4 transition-colors hover:border-slate">
        <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-stone-100 text-forest">
          <Icon name="chat" size={20} />
          {unread > 0 && <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full border-2 border-surface bg-coral-600" aria-hidden="true" />}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-semibold">Kundeservice</span>
          <span className="block text-small text-muted">{unread > 0 ? (unread === 1 ? 'Du har 1 nyt svar' : `Du har ${unread} nye svar`) : 'Skriv til os, og følg dine henvendelser'}</span>
        </span>
        <Icon name="next" size={20} className="text-muted" />
      </Link>

      <Link href="/konto/sikkerhed/" className="flex items-center gap-4 rounded-lg border border-line p-4 transition-colors hover:border-slate">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-stone-100 text-forest"><Icon name="shield" size={20} /></span>
        <span className="min-w-0 flex-1">
          <span className="block font-semibold">Login og sikkerhed</span>
          <span className="block text-small text-muted">Passkeys, to-trins-login og gendannelseskoder</span>
        </span>
        <Icon name="next" size={20} className="text-muted" />
      </Link>

      <section aria-labelledby="enheder" className="border-t border-line pt-6">
        <h2 id="enheder" className={h2}>Aktive enheder</h2>
        <p className="mt-1 text-small text-muted">Kan du ikke genkende en enhed, så log den ud og skift adgangskode.</p>
        <ul className="mt-4 divide-y divide-line rounded-lg border border-line">
          {list.map((s) => (
            <li key={s.id} className="flex items-center gap-3 px-4 py-3">
              <Icon name="phone" size={20} className="shrink-0 text-muted" />
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{device(s.userAgent)}{s.id === current.session.id && <span className="font-normal text-muted"> · denne enhed</span>}</p>
                <p className="text-small text-muted">Sidst aktiv {fmt(s.lastSeenAt)}</p>
              </div>
              {s.id !== current.session.id && (
                <form action={revokeSessionAction}>
                  <input type="hidden" name="sessionId" value={s.id} />
                  <Button type="submit" size="sm" variant="outline">Log ud</Button>
                </form>
              )}
            </li>
          ))}
        </ul>
        {list.length > 1 && <form action={signOutOthersAction} className="mt-3"><Button type="submit" variant="outline">Log ud på alle andre enheder</Button></form>}
      </section>

      <section aria-labelledby="adgangskode" className="border-t border-line pt-6">
        <h2 id="adgangskode" className={h2}>Skift adgangskode</h2>
        <div className="mt-4 max-w-md"><ChangePasswordForm /></div>
      </section>

      <form action={signOutAction} className="border-t border-line pt-6"><Button type="submit" variant="dark" icon="logout">Log ud</Button></form>
    </AuthPage>
  );
}
