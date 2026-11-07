/** Kategorier og stand – egen fil, så header og filtre kan bruge dem uden at trække hele kataloget med i browseren. */
import type { IconName } from '@respin/ui';

export type CategorySlug = 'kvinder' | 'maend' | 'boern' | 'sko' | 'tasker' | 'accessories' | 'bolig' | 'sport';

/** En gruppe i megamenuen, fx "Overtøj" under Kvinder */
export interface CategoryGroup { label: string; icon: IconName; items: readonly string[] }

export interface Category {
  slug: CategorySlug;
  label: string;
  icon: IconName;
  /** Kort tekst til kategorisiden */
  intro: string;
  /** Grupper med typer (megamenu og mobilmenu) */
  groups: readonly CategoryGroup[];
  /** Alle typer i kategorien (filtre, validering af annoncer) – udledt af grupperne */
  subs: readonly string[];
}

const cat = (c: Omit<Category, 'subs'>): Category => ({ ...c, subs: c.groups.flatMap((g) => g.items) });

export const CATEGORIES: readonly Category[] = [
  cat({ slug: 'kvinder', label: 'Kvinder', icon: 'shirt', intro: 'Jakker, kjoler, strik og jeans fra danske og nordiske mærker.', groups: [
    { label: 'Overtøj', icon: 'shirt', items: ['Jakker og frakker', 'Blazere', 'Veste', 'Regntøj'] },
    { label: 'Tøj', icon: 'hoodie', items: ['Kjoler', 'Strik', 'Toppe og bluser', 'T-shirts', 'Bukser og jeans', 'Nederdele', 'Shorts', 'Hoodies og sweatshirts', 'Jumpsuits'] },
    { label: 'Særlige lejligheder', icon: 'sparkle', items: ['Festtøj', 'Badetøj', 'Lingeri og nattøj', 'Sportstøj', 'Ventetøj'] }
  ] }),
  cat({ slug: 'maend', label: 'Mænd', icon: 'hoodie', intro: 'Overtøj, strik, jeans og skjorter – brugt, men langt fra brugt op.', groups: [
    { label: 'Overtøj', icon: 'shirt', items: ['Jakker', 'Frakker', 'Veste', 'Regntøj'] },
    { label: 'Tøj', icon: 'hoodie', items: ['Strik og sweatshirts', 'Skjorter og T-shirts', 'Bukser og jeans', 'Shorts', 'Jakkesæt og blazere', 'Hoodies'] },
    { label: 'Mere', icon: 'sparkle', items: ['Sportstøj', 'Badetøj', 'Undertøj og sokker', 'Nattøj'] }
  ] }),
  cat({ slug: 'boern', label: 'Børn', icon: 'baby', intro: 'Børn vokser hurtigt. Køb og sælg overtøj, tøj og legetøj videre.', groups: [
    { label: 'Tøj', icon: 'baby', items: ['Overtøj', 'Tøj', 'Babytøj', 'Flyverdragter', 'Regntøj til børn', 'Sko til børn'] },
    { label: 'Leg og udstyr', icon: 'ball', items: ['Legetøj', 'Barnevogne og klapvogne', 'Autostole', 'Børnebøger', 'Børneværelset'] }
  ] }),
  cat({ slug: 'sko', label: 'Sko', icon: 'sneaker', intro: 'Sneakers, støvler og sandaler – mange næsten ikke brugt.', groups: [
    { label: 'Hverdag', icon: 'sneaker', items: ['Sneakers', 'Støvler', 'Sandaler', 'Loafers og sko', 'Ballerinaer'] },
    { label: 'Fest og sport', icon: 'sparkle', items: ['Pumps og stiletter', 'Løbesko', 'Gummistøvler', 'Hjemmesko'] }
  ] }),
  cat({ slug: 'tasker', label: 'Tasker', icon: 'bag', intro: 'Skuldertasker, rygsække og punge.', groups: [
    { label: 'Tasker', icon: 'bag', items: ['Skuldertasker', 'Håndtasker', 'Crossbody', 'Muleposer og shoppere', 'Clutches'] },
    { label: 'Rejse og hverdag', icon: 'package', items: ['Rygsække', 'Rejsetasker', 'Computertasker', 'Punge'] }
  ] }),
  cat({ slug: 'accessories', label: 'Accessories', icon: 'gem', intro: 'Smykker, ure, huer og solbriller.', groups: [
    { label: 'Smykker og ure', icon: 'gem', items: ['Smykker', 'Ure'] },
    { label: 'Tilbehør', icon: 'sparkle', items: ['Solbriller', 'Huer', 'Kasketter', 'Tørklæder', 'Bælter', 'Handsker', 'Hårpynt'] }
  ] }),
  cat({ slug: 'bolig', label: 'Bolig', icon: 'home', intro: 'Lamper, møbler og ting til køkkenet med historie.', groups: [
    { label: 'Indretning', icon: 'home', items: ['Møbler', 'Lamper', 'Dekoration', 'Tekstiler', 'Kunst og plakater'] },
    { label: 'Køkken og bord', icon: 'package', items: ['Køkken', 'Spisestel og glas', 'Vaser og krukker', 'Planter og potter'] }
  ] }),
  cat({ slug: 'sport', label: 'Sport', icon: 'ball', intro: 'Udstyr til løb, cykling og en tur i bjergene.', groups: [
    { label: 'Udendørs', icon: 'pin', items: ['Løb', 'Cykling', 'Outdoor', 'Ski og snowboard', 'Golf'] },
    { label: 'Træning og spil', icon: 'ball', items: ['Fitness', 'Yoga', 'Fodbold', 'Ketsjersport', 'Svømning'] }
  ] })
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
