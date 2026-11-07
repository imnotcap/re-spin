'use client';

import { LazyRotatingText } from '../LazyBits';
import { useI18n } from '../../lib/i18n/client';

/** De skiftende ord i banneret på det valgte sprog (genstarter, når sproget skiftes) */
export function HeroWords() {
  const { t, locale } = useI18n();
  const words = t('hero.words').split('|') as [string, ...string[]];
  return <LazyRotatingText key={locale} texts={words} />;
}
