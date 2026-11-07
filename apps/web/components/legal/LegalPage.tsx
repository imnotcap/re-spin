import type { ReactNode } from 'react';
import { Breadcrumbs, Notice } from '@respin/ui';
import { T } from '../../lib/i18n/client';

export interface LegalSection { id: string; title: string; body: ReactNode }

/** Fælles opsætning af juridiske sider: titel, dato, indholdsfortegnelse og afsnit med ankre */
export function LegalPage({ title, intro, updated, sections, draft = true, children }: {
  title: string; intro: ReactNode; updated: string; sections: LegalSection[]; draft?: boolean; children?: ReactNode;
}) {
  return (
    <div className="mx-auto max-w-7xl px-4 pt-5 sm:px-6">
      <Breadcrumbs items={[{ label: <T k="crumb.home" />, href: '/' }, { label: title }]} />
      <div className="mt-6 grid gap-10 lg:grid-cols-[240px_minmax(0,1fr)]">
        <nav aria-label="Indhold" className="lg:sticky lg:top-24 lg:self-start">
          <p className="text-caption font-bold uppercase tracking-[0.08em] text-muted">Indhold</p>
          <ol className="mt-2 space-y-1 text-small">
            {sections.map((s) => <li key={s.id}><a href={`#${s.id}`} className="block rounded-sm py-1 text-slate-700 underline-offset-4 hover:text-ink hover:underline">{s.title}</a></li>)}
          </ol>
        </nav>
        <article className="max-w-3xl">
          <h1 className="text-[32px] font-bold leading-[38px] tracking-[-0.01em]">{title}</h1>
          <p className="mt-1 text-small text-muted">Senest opdateret {updated}</p>
          <div className="mt-4 text-body text-slate-700 sm:text-[17px] sm:leading-[27px]">{intro}</div>
          {draft && <Notice icon="info" warn className="mt-5">Testversion: teksten er et udkast og skal gennemgås af en jurist, før re:spin åbner for rigtige handler.</Notice>}
          {children}
          {sections.map((s) => (
            <section key={s.id} id={s.id} aria-labelledby={`${s.id}-t`} className="mt-10 scroll-mt-28">
              <h2 id={`${s.id}-t`} className="text-h2">{s.title}</h2>
              <div className="legal mt-3 space-y-3 text-body text-slate-700">{s.body}</div>
            </section>
          ))}
        </article>
      </div>
    </div>
  );
}
