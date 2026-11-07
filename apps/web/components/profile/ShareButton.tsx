'use client';

import { Button, useToast } from '@respin/ui';
import { useI18n } from '../../lib/i18n/client';

/** Del profilen: telefonens del-menu, ellers kopieres linket */
export function ShareButton({ path, title }: { path: string; title: string }) {
  const { t } = useI18n();
  const { toast } = useToast();
  const share = async () => {
    const url = new URL(path, window.location.origin).toString();
    try {
      if (navigator.share) { await navigator.share({ title, url }); return; }
      await navigator.clipboard.writeText(url);
      toast(t('profile.copied'), { icon: 'check' });
    } catch { /* afbrudt af brugeren */ }
  };
  return <Button variant="outline" size="sm" icon="share" onClick={share}>{t('profile.share')}</Button>;
}
