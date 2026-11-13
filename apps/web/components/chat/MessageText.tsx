'use client';

import { useRef, useState, type MouseEvent } from 'react';
import { Button, Icon } from '@respin/ui';
import { isInternal, splitLinks } from '../../lib/chat-links';

/**
 * Teksten i en chatbesked med klikbare links. Klik på et link til en anden side åbner først en advarsel:
 * svindlere sender ofte links til falske betalings- eller fragtsider for at få kortoplysninger eller adgangskoder.
 */
export function MessageText({ body, mine }: { body: string; mine: boolean }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [target, setTarget] = useState<string | null>(null);
  const parts = splitLinks(body);

  const onClick = (e: MouseEvent<HTMLAnchorElement>, href: string) => {
    if (isInternal(href, window.location.host)) return;
    e.preventDefault();
    setTarget(href);
    dialog.current?.showModal();
  };
  const close = () => dialog.current?.close();
  const host = target ? new URL(target).hostname : '';

  return (
    <>
      {parts.map((p, i) => 'href' in p
        ? <a key={i} href={p.href} target="_blank" rel="noopener noreferrer nofollow ugc" onClick={(e) => onClick(e, p.href)}
            className={`break-all underline underline-offset-2 ${mine ? 'text-lime' : 'text-forest'}`}>{p.text}</a>
        : <span key={i}>{p.text}</span>)}
      {parts.some((p) => 'href' in p) && (
        <dialog ref={dialog} onClose={() => setTarget(null)} aria-labelledby="link-advarsel"
          className="m-auto w-[min(440px,calc(100vw-32px))] rounded-2xl border border-line bg-surface p-0 text-left text-ink shadow-xl backdrop:bg-black/40">
          <div className="p-6">
            <span className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-full bg-amber-50 text-amber-800"><Icon name="shield" size={22} /></span>
            <h2 id="link-advarsel" className="text-[20px] font-bold leading-7">Du er ved at forlade Videro</h2>
            <p className="mt-2 text-body text-slate-700">Linket fører til <b className="break-all text-ink">{host}</b>. Videro står ikke bag siden og kan ikke se, hvad der sker dér.</p>
            <ul className="mt-3 flex flex-col gap-1.5 text-small text-slate-700">
              <li className="flex gap-2"><Icon name="info" size={16} className="mt-0.5 shrink-0 text-amber-700" />Betal aldrig uden om Videro – så mister du køberbeskyttelsen.</li>
              <li className="flex gap-2"><Icon name="info" size={16} className="mt-0.5 shrink-0 text-amber-700" />Skriv aldrig din adgangskode, dit kortnummer eller MitID på en side, du har fået et link til.</li>
            </ul>
            <p className="mt-3 break-all rounded-md bg-sunken px-3 py-2 font-mono text-caption text-muted">{target}</p>
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => { if (target) window.open(target, '_blank', 'noopener,noreferrer'); close(); }}>Åbn linket alligevel</Button>
              <Button type="button" onClick={close} autoFocus>Bliv på Videro</Button>
            </div>
          </div>
        </dialog>
      )}
    </>
  );
}
