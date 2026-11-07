import type { ReactNode } from 'react';
import { Breadcrumbs, type Crumb } from '@respin/ui';

/**
 * Ramme om login- og kontosider: samme header/footer som resten af siden, indholdet i en rolig kolonne.
 * `width="form"` til login/tilmelding (smal), `width="page"` til kontosider.
 */
export function AuthPage({ title, intro, children, crumbs, width = 'form' }: {
  title: string;
  intro?: ReactNode;
  children: ReactNode;
  crumbs?: ReadonlyArray<Crumb>;
  width?: 'form' | 'page';
}) {
  return (
    <div className={`mx-auto w-full px-4 pb-6 sm:px-6 ${width === 'form' ? 'max-w-[480px] pt-8 sm:pt-14' : 'max-w-3xl pt-5'}`}>
      {crumbs && <Breadcrumbs items={crumbs} />}
      <h1 className={`text-[28px] font-bold leading-[34px] tracking-[-0.01em] ${crumbs ? 'mt-6' : ''}`}>{title}</h1>
      {intro && <p className="mt-2 text-body text-muted">{intro}</p>}
      <div className="mt-6 flex flex-col gap-5">{children}</div>
    </div>
  );
}

/** Link i login-sidernes tekst – samme stil som resten af siden */
export const linkCls = 'font-semibold text-forest underline underline-offset-4';
