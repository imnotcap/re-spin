'use client';

import { startTransition, useActionState, useState, type FormEvent } from 'react';
import { Button, Field, Notice, Textarea } from '@respin/ui';
import { BANNERS, type BannerId } from '../../lib/banners';
import { profilePath } from '../../lib/profile-url';
import { BASE_PATH } from '../../lib/site';
import { updateProfileAction, type ProfileFormState } from '../../lib/profile-actions';
import { BannerArt } from './ProfileView';

/** Rediger profil: profilnavn (adressen /@/navn), tekst om dig og banner */
export function ProfileForm({ username, bio, banner }: { username: string; bio: string; banner: BannerId }) {
  const [state, action, pending] = useActionState<ProfileFormState, FormData>(updateProfileAction, undefined);
  const [chosen, setChosen] = useState<BannerId>(banner);
  const [text, setText] = useState(bio);
  const current = state?.username ?? username;
  const err = (f: string) => (state?.field === f ? state.error : undefined);
  const submit = (e: FormEvent<HTMLFormElement>) => { e.preventDefault(); const fd = new FormData(e.currentTarget); startTransition(() => action(fd)); };

  return (
    <form onSubmit={submit} className="flex flex-col gap-5" noValidate>
      {state?.saved && <Notice icon="check" role="status">Profilen er gemt. <a className="font-semibold underline" href={`${BASE_PATH}${profilePath(current)}`}>Se din profil</a></Notice>}
      {state?.error && !state.field && <Notice icon="info" warn role="alert">{state.error}</Notice>}
      <Field label="Profilnavn" name="username" defaultValue={username} required minLength={3} maxLength={30} autoComplete="username" autoCapitalize="none" spellCheck={false}
        hint={`Din profil får adressen /@/${current}. Små bogstaver, tal, punktum, bindestreg eller understreg.`} error={err('username')} />
      <Textarea label="Om dig" name="bio" optional rows={3} maxLength={300} value={text} onChange={(e) => setText(e.target.value)} error={err('bio')}
        hint={`${text.length}/300 tegn. Fx hvad du sælger, og hvor hurtigt du sender.`} />
      <fieldset>
        <legend className="text-body font-semibold">Banner</legend>
        {err('banner') && <p className="text-small text-red-700" role="alert">{err('banner')}</p>}
        <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {BANNERS.map((b) => (
            <label key={b.id} className={`group relative block cursor-pointer overflow-hidden rounded-md border-2 ${chosen === b.id ? 'border-forest' : 'border-line hover:border-slate'}`}>
              <input type="radio" name="banner" value={b.id} checked={chosen === b.id} onChange={() => setChosen(b.id)} className="peer sr-only" />
              <span className="block h-14"><BannerArt banner={b} /></span>
              <span className="block bg-surface px-2 py-1.5 text-caption font-semibold">{b.label}</span>
              <span className="pointer-events-none absolute inset-0 rounded-[4px] peer-focus-visible:outline peer-focus-visible:outline-3 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-forest" />
            </label>
          ))}
        </div>
      </fieldset>
      <div><Button type="submit" disabled={pending}>{pending ? 'Gemmer…' : 'Gem profil'}</Button></div>
    </form>
  );
}
