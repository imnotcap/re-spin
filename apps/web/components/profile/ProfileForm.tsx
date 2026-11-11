'use client';

import { startTransition, useActionState, useRef, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Avatar, Button, Field, Icon, Notice, Textarea } from '@respin/ui';
import { BANNERS, CUSTOM_BANNER, DEFAULT_BANNER, bannerById, type BannerId } from '../../lib/banners';
import { profilePath } from '../../lib/profile-url';
import { BASE_PATH } from '../../lib/site';
import { shrinkImage } from '../../lib/shrink-image';
import { refreshMe } from '../../lib/me';
import { updateProfileAction, type ProfileFormState } from '../../lib/profile-actions';
import { BannerArt } from './ProfileView';

type Kind = 'avatar' | 'banner';
const ACCEPT = 'image/jpeg,image/png,image/webp';

async function sendImage(kind: Kind, file: File): Promise<{ url: string } | { error: string }> {
  try {
    const blob = await shrinkImage(file);
    const res = await fetch(`/api/profil/billede/?type=${kind}`, { method: 'POST', body: blob, headers: { 'Content-Type': blob.type || 'application/octet-stream' }, credentials: 'same-origin' });
    const body = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
    return res.ok && body.url ? { url: body.url } : { error: body.error ?? 'Upload fejlede.' };
  } catch {
    return { error: 'Ingen forbindelse. Prøv igen.' };
  }
}

async function deleteImage(kind: Kind): Promise<boolean> {
  try {
    return (await fetch(`/api/profil/billede/?type=${kind}`, { method: 'DELETE', credentials: 'same-origin' })).ok;
  } catch {
    return false;
  }
}

/** Knap, der åbner filvælgeren (et skjult <input type="file"> bag en almindelig knap) */
function PickButton({ label, busy, onFile, variant = 'outline' }: { label: string; busy: boolean; onFile: (f: File) => void; variant?: 'outline' | 'ghost' }) {
  const input = useRef<HTMLInputElement>(null);
  return (
    <>
      <input ref={input} type="file" accept={ACCEPT} className="sr-only" tabIndex={-1} aria-hidden="true"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = ''; }} />
      <Button type="button" variant={variant} size="sm" icon="upload" disabled={busy} onClick={() => input.current?.click()}>{busy ? 'Uploader…' : label}</Button>
    </>
  );
}

/** Rediger profil: profilbillede, profilnavn (adressen /@/navn), tekst om dig og banner (fast eller eget billede) */
export function ProfileForm({ name, username, bio, banner, avatarUrl, bannerUrl }: {
  name: string; username: string; bio: string; banner: BannerId; avatarUrl: string | null; bannerUrl: string | null;
}) {
  const router = useRouter();
  const [state, action, pending] = useActionState<ProfileFormState, FormData>(updateProfileAction, undefined);
  const [chosen, setChosen] = useState<BannerId>(banner === CUSTOM_BANNER && !bannerUrl ? DEFAULT_BANNER : banner);
  const [text, setText] = useState(bio);
  const [avatar, setAvatar] = useState(avatarUrl);
  const [custom, setCustom] = useState(bannerUrl);
  const [busy, setBusy] = useState<Kind | null>(null);
  const [imgError, setImgError] = useState<{ kind: Kind; text: string } | null>(null);
  const current = state?.username ?? username;
  const err = (f: string) => (state?.field === f ? state.error : undefined);
  const submit = (e: FormEvent<HTMLFormElement>) => { e.preventDefault(); const fd = new FormData(e.currentTarget); startTransition(() => action(fd)); };

  const upload = async (kind: Kind, file: File) => {
    setBusy(kind); setImgError(null);
    const r = await sendImage(kind, file);
    setBusy(null);
    if ('error' in r) { setImgError({ kind, text: r.error }); return; }
    if (kind === 'avatar') { setAvatar(r.url); refreshMe(); }
    else { setCustom(r.url); setChosen(CUSTOM_BANNER); }
    router.refresh();
  };
  const remove = async (kind: Kind) => {
    setBusy(kind); setImgError(null);
    const ok = await deleteImage(kind);
    setBusy(null);
    if (!ok) { setImgError({ kind, text: 'Billedet kunne ikke fjernes. Prøv igen.' }); return; }
    if (kind === 'avatar') { setAvatar(null); refreshMe(); }
    else { setCustom(null); if (chosen === CUSTOM_BANNER) setChosen(DEFAULT_BANNER); }
    router.refresh();
  };
  const imgErr = (kind: Kind) => imgError?.kind === kind && <p className="mt-2 text-small text-red-700" role="alert">{imgError.text}</p>;
  const tile = (selected: boolean) => `group relative block cursor-pointer overflow-hidden rounded-md border-2 ${selected ? 'border-forest' : 'border-line hover:border-slate'}`;

  return (
    <form onSubmit={submit} className="flex flex-col gap-5" noValidate>
      {state?.saved && <Notice icon="check" role="status">Profilen er gemt. <a className="font-semibold underline" href={`${BASE_PATH}${profilePath(current)}`}>Se din profil</a></Notice>}
      {state?.error && !state.field && <Notice icon="info" warn role="alert">{state.error}</Notice>}

      <div>
        <p className="text-body font-semibold">Profilbillede</p>
        <div className="mt-2 flex flex-wrap items-center gap-4">
          <Avatar name={name} src={avatar ?? undefined} size="xl" className={busy === 'avatar' ? 'opacity-50' : ''} />
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap gap-2">
              <PickButton label={avatar ? 'Skift billede' : 'Upload billede'} busy={busy === 'avatar'} onFile={(f) => upload('avatar', f)} />
              {avatar && <Button type="button" variant="ghost" size="sm" icon="trash" disabled={busy !== null} onClick={() => remove('avatar')}>Fjern</Button>}
            </div>
            <p className="text-caption text-muted">JPEG, PNG eller WebP, højst 4 MB. Billedet beskæres kvadratisk og gemmes med det samme.</p>
          </div>
        </div>
        {imgErr('avatar')}
      </div>

      <Field label="Profilnavn" name="username" defaultValue={username} required minLength={3} maxLength={30} autoComplete="username" autoCapitalize="none" spellCheck={false}
        hint={`Din profil får adressen /@/${current}. Små bogstaver, tal, punktum, bindestreg eller understreg.`} error={err('username')} />
      <Textarea label="Om dig" name="bio" optional rows={3} maxLength={300} value={text} onChange={(e) => setText(e.target.value)} error={err('bio')}
        hint={`${text.length}/300 tegn. Fx hvad du sælger, og hvor hurtigt du sender.`} />
      <fieldset>
        <legend className="text-body font-semibold">Banner</legend>
        {err('banner') && <p className="text-small text-red-700" role="alert">{err('banner')}</p>}
        <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {/* Eget billede: valgbart, når det er uploadet – ellers en upload-flise */}
          {custom ? (
            <label className={tile(chosen === CUSTOM_BANNER)}>
              <input type="radio" name="banner" value={CUSTOM_BANNER} checked={chosen === CUSTOM_BANNER} onChange={() => setChosen(CUSTOM_BANNER)} className="peer sr-only" />
              <span className={`block h-14 ${busy === 'banner' ? 'opacity-50' : ''}`}><BannerArt banner={bannerById(CUSTOM_BANNER, custom)} priority={false} /></span>
              <span className="block bg-surface px-2 py-1.5 text-caption font-semibold">Eget billede</span>
              <span className="pointer-events-none absolute inset-0 rounded-[4px] peer-focus-visible:outline peer-focus-visible:outline-3 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-forest" />
            </label>
          ) : (
            <BannerUploadTile busy={busy === 'banner'} onFile={(f) => upload('banner', f)} />
          )}
          {BANNERS.map((b) => (
            <label key={b.id} className={tile(chosen === b.id)}>
              <input type="radio" name="banner" value={b.id} checked={chosen === b.id} onChange={() => setChosen(b.id)} className="peer sr-only" />
              <span className="block h-14"><BannerArt banner={b} priority={false} /></span>
              <span className="block bg-surface px-2 py-1.5 text-caption font-semibold">{b.label}</span>
              <span className="pointer-events-none absolute inset-0 rounded-[4px] peer-focus-visible:outline peer-focus-visible:outline-3 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-forest" />
            </label>
          ))}
        </div>
        {custom && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <PickButton label="Skift eget billede" busy={busy === 'banner'} onFile={(f) => upload('banner', f)} />
            <Button type="button" variant="ghost" size="sm" icon="trash" disabled={busy !== null} onClick={() => remove('banner')}>Fjern eget billede</Button>
          </div>
        )}
        <p className="mt-2 text-caption text-muted">Eget billede: JPEG, PNG eller WebP, højst 4 MB. Det beskæres til et bredt banner (4:1).</p>
        {imgErr('banner')}
      </fieldset>
      <div><Button type="submit" disabled={pending || busy !== null}>{pending ? 'Gemmer…' : 'Gem profil'}</Button></div>
    </form>
  );
}

/** Flise i bannergitteret, der åbner filvælgeren */
function BannerUploadTile({ busy, onFile }: { busy: boolean; onFile: (f: File) => void }) {
  const input = useRef<HTMLInputElement>(null);
  return (
    <div>
      <input ref={input} type="file" accept={ACCEPT} className="sr-only" tabIndex={-1} aria-hidden="true"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = ''; }} />
      <button type="button" disabled={busy} onClick={() => input.current?.click()}
        className="flex w-full flex-col overflow-hidden rounded-md border-2 border-dashed border-line text-left transition-colors hover:border-slate focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-forest disabled:opacity-60">
        <span className="flex h-14 w-full items-center justify-center bg-stone-50 text-forest"><Icon name="upload" size={22} /></span>
        <span className="block w-full bg-surface px-2 py-1.5 text-caption font-semibold">{busy ? 'Uploader…' : 'Upload eget'}</span>
      </button>
    </div>
  );
}
