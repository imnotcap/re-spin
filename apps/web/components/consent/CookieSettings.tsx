'use client';

import { useEffect, useState } from 'react';
import { Button, Notice } from '@respin/ui';
import { clearConsent, saveConsent, useConsent } from '../../lib/consent';
import { useI18n } from '../../lib/i18n/client';
import { ConsentChoices } from './ConsentChoices';

/** Cookieindstillinger-siden: se og ændr dit valg når som helst */
export function CookieSettings() {
  const consent = useConsent();
  const { t, locale } = useI18n();
  const [choice, setChoice] = useState({ statistics: false, marketing: false });
  const [saved, setSaved] = useState(false);
  useEffect(() => { if (consent && consent !== 'unknown') setChoice({ statistics: consent.statistics, marketing: consent.marketing }); }, [consent]);

  return (
    <div className="mt-6 rounded-lg border border-line p-5">
      <p className="font-semibold">{t('cookie.current')}</p>
      <p className="text-small text-muted">
        {consent === 'unknown' ? '…' : consent ? new Date(consent.at).toLocaleString(locale === 'da' ? 'da-DK' : undefined, { dateStyle: 'long', timeStyle: 'short' }) : t('cookie.none')}
      </p>
      <div className="mt-3"><ConsentChoices {...choice} onChange={(c) => { setChoice(c); setSaved(false); }} /></div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button onClick={() => { saveConsent(choice); setSaved(true); }}>{t('cookie.save')}</Button>
        <Button variant="outline" onClick={() => { saveConsent({ statistics: false, marketing: false }); setChoice({ statistics: false, marketing: false }); setSaved(true); }}>{t('cookie.necessaryOnly')}</Button>
        <Button variant="ghost" onClick={() => { clearConsent(); setSaved(false); }}>{t('cookie.reset')}</Button>
      </div>
      <div aria-live="polite">{saved && <Notice icon="check" className="mt-4">{t('cookie.saved')}</Notice>}</div>
    </div>
  );
}
