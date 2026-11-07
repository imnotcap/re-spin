'use client';

import { useId } from 'react';
import { Toggle } from '@respin/ui';
import { useI18n } from '../../lib/i18n/client';

/** De tre kategorier med kontakter. Nødvendige kan ikke slås fra. */
export function ConsentChoices({ statistics, marketing, onChange }: { statistics: boolean; marketing: boolean; onChange: (c: { statistics: boolean; marketing: boolean }) => void }) {
  const { t } = useI18n();
  const id = useId();
  const row = (key: 'necessary' | 'statistics' | 'marketing', control: React.ReactNode) => (
    <li className="flex items-start justify-between gap-4 py-3">
      <div>
        <p id={`${id}-${key}`} className="font-semibold">{t(`cookie.${key}`)}</p>
        <p id={`${id}-${key}-d`} className="text-small text-muted">{t(`cookie.${key}Desc`)}</p>
      </div>
      {control}
    </li>
  );
  return (
    <ul className="divide-y divide-line">
      {row('necessary', <span className="shrink-0 rounded-pill bg-stone-100 px-2.5 py-1 text-caption font-semibold">{t('cookie.alwaysOn')}</span>)}
      {row('statistics', <Toggle label={t('cookie.statistics')} aria-describedby={`${id}-statistics-d`} checked={statistics} onChange={(e) => onChange({ statistics: e.target.checked, marketing })} />)}
      {row('marketing', <Toggle label={t('cookie.marketing')} aria-describedby={`${id}-marketing-d`} checked={marketing} onChange={(e) => onChange({ statistics, marketing: e.target.checked })} />)}
    </ul>
  );
}
