/** Kategorier og stand – egen fil, så header og filtre kan bruge dem uden at trække hele kataloget med i browseren. */
import type { IconName } from '@respin/ui';

export type CategorySlug = 'kvinder' | 'maend' | 'boern' | 'sko' | 'tasker' | 'accessories' | 'bolig' | 'sport';

export interface Category {
  slug: CategorySlug;
  label: string;
  icon: IconName;
  /** Kort tekst til kategorisiden */
  intro: string;
  subs: readonly string[];
}

export const CATEGORIES: readonly Category[] = [
  { slug: 'kvinder', label: 'Kvinder', icon: 'shirt', intro: 'Jakker, kjoler, strik og jeans fra danske og nordiske mærker.', subs: ['Jakker og frakker', 'Kjoler', 'Strik', 'Bukser og jeans', 'Toppe og bluser'] },
  { slug: 'maend', label: 'Mænd', icon: 'hoodie', intro: 'Overtøj, strik, jeans og skjorter – brugt, men langt fra brugt op.', subs: ['Jakker', 'Strik og sweatshirts', 'Bukser og jeans', 'Skjorter og T-shirts'] },
  { slug: 'boern', label: 'Børn', icon: 'baby', intro: 'Børn vokser hurtigt. Køb og sælg overtøj, tøj og legetøj videre.', subs: ['Overtøj', 'Tøj', 'Legetøj'] },
  { slug: 'sko', label: 'Sko', icon: 'sneaker', intro: 'Sneakers, støvler og sandaler – mange næsten ikke brugt.', subs: ['Sneakers', 'Støvler', 'Sandaler'] },
  { slug: 'tasker', label: 'Tasker', icon: 'bag', intro: 'Skuldertasker, rygsække og punge.', subs: ['Skuldertasker', 'Rygsække', 'Punge'] },
  { slug: 'accessories', label: 'Accessories', icon: 'gem', intro: 'Smykker, ure, huer og solbriller.', subs: ['Smykker', 'Ure', 'Huer', 'Tørklæder', 'Solbriller'] },
  { slug: 'bolig', label: 'Bolig', icon: 'home', intro: 'Lamper, møbler og ting til køkkenet med historie.', subs: ['Lamper', 'Møbler', 'Køkken', 'Dekoration'] },
  { slug: 'sport', label: 'Sport', icon: 'ball', intro: 'Udstyr til løb, cykling og en tur i bjergene.', subs: ['Løb', 'Cykling', 'Outdoor'] }
] as const;

export type Condition = 'Ny med mærke' | 'Ny uden mærke' | 'Meget god' | 'God' | 'Tilfredsstillende';
/** Fra bedst til mindst god – bruges til filtre */
export const CONDITIONS: readonly Condition[] = ['Ny med mærke', 'Ny uden mærke', 'Meget god', 'God', 'Tilfredsstillende'];
export const CONDITION_HELP: Record<Condition, string> = {
  'Ny med mærke': 'Aldrig brugt, med originalt mærke eller i original emballage.',
  'Ny uden mærke': 'Aldrig brugt, men mærket er taget af.',
  'Meget god': 'Brugt få gange. Ingen synlige tegn på slid.',
  God: 'Brugt, med små tegn på slid. Beskrevet i annoncen.',
  Tilfredsstillende: 'Brugt meget. Fejl og slid er beskrevet og vist på billederne.'
};
