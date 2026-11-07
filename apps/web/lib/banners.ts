/** Profilbannere, man kan vælge imellem: tre fotos og fem farver fra sidens palet. Sikker at bruge i browseren. */
import { BASE_PATH } from './site';

export type BannerId = 'stativ' | 'butik' | 'saelg' | 'skov' | 'lime' | 'sand' | 'koral' | 'nat';
export interface Banner { id: BannerId; label: string; photo?: { src: string; srcSet: string }; className?: string }

const photo = (name: string) => ({
  src: `${BASE_PATH}/img/profil/${name}-800.webp`,
  srcSet: `${BASE_PATH}/img/profil/${name}-800.webp 800w, ${BASE_PATH}/img/profil/${name}-1600.webp 1600w`
});

export const BANNERS: readonly Banner[] = [
  { id: 'stativ', label: 'Tøjstativ', photo: photo('stativ') },
  { id: 'butik', label: 'Genbrugsbutik', photo: photo('butik') },
  { id: 'saelg', label: 'Garderobe', photo: photo('saelg') },
  { id: 'skov', label: 'Skovgrøn', className: 'bg-forest' },
  { id: 'lime', label: 'Lime', className: 'bg-lime' },
  { id: 'sand', label: 'Sand', className: 'bg-cream-200' },
  { id: 'koral', label: 'Koral', className: 'bg-coral-600' },
  { id: 'nat', label: 'Nat', className: 'bg-slate' }
];

export const DEFAULT_BANNER: BannerId = 'skov';
export const isBannerId = (v: unknown): v is BannerId => typeof v === 'string' && BANNERS.some((b) => b.id === v);
export const bannerById = (id: string | null | undefined): Banner => BANNERS.find((b) => b.id === id) ?? BANNERS.find((b) => b.id === DEFAULT_BANNER)!;
