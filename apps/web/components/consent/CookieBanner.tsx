'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@respin/ui';
import { saveConsent, useConsent } from '../../lib/consent';
import { useI18n } from '../../lib/i18n/client';
import { ConsentChoices } from './ConsentChoices';

/**
 * Cookie-popup nederst på skærmen. Vises kun, når der ikke er et gyldigt valg (aldrig på serveren, så den
 * blinker ikke for dem, der har svaret). "Kun nødvendige" er lige så synlig som "Accepter alle".
 * Ikke-modal: siden kan bruges imens, og den flytter intet på siden (fast placeret).
 */
export function CookieBanner() {
  const consent = useConsent();
  const pathname = usePathname();
  const { t } = useI18n();
  const [custom, setCustom] = useState(false);
  const [choice, setChoice] = useState({ statistics: false, marketing: false });
  // Indstillingssiden har selv formularen
  if (consent !== null || pathname === '/cookieindstillinger/') return null;

  return (
    <section role="dialog" aria-modal="false" aria-labelledby="cookie-title" aria-describedby="cookie-text"
      className="fixed inset-x-3 bottom-3 z-50 max-h-[calc(100dvh-24px)] overflow-y-auto rounded-lg border border-line bg-surface p-5 shadow-float sm:left-auto sm:right-5 sm:bottom-5 sm:w-[440px]">
      <h2 id="cookie-title" className="text-h3">{t('cookie.title')}</h2>
      <p id="cookie-text" className="mt-1.5 text-small text-slate-700">{t('cookie.text')} <Link href="/cookiepolitik/" className="font-semibold text-forest underline underline-offset-2">{t('cookie.readMore')}</Link></p>
      {custom && <div className="mt-3 border-t border-line"><ConsentChoices {...choice} onChange={setChoice} /></div>}
      <div className="mt-4 grid grid-cols-2 gap-2">
        {custom ? (
          <>
            <Button variant="outline" onClick={() => saveConsent(choice)}>{t('cookie.save')}</Button>
            <Button variant="dark" onClick={() => saveConsent({ statistics: true, marketing: true })}>{t('cookie.acceptAll')}</Button>
          </>
        ) : (
          <>
            <Button variant="dark" onClick={() => saveConsent({ statistics: false, marketing: false })}>{t('cookie.necessaryOnly')}</Button>
            <Button variant="dark" onClick={() => saveConsent({ statistics: true, marketing: true })}>{t('cookie.acceptAll')}</Button>
            <Button variant="ghost" className="col-span-2" onClick={() => setCustom(true)}>{t('cookie.customize')}</Button>
          </>
        )}
      </div>
    </section>
  );
}
