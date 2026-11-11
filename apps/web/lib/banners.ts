/** Profilbannere, man kan vælge imellem: Videro-banneret (standard), tre fotos og fem farver fra sidens palet. Sikker at bruge i browseren. */
import { BASE_PATH } from './site';

export type PresetBannerId = 'videro' | 'stativ' | 'butik' | 'saelg' | 'skov' | 'lime' | 'sand' | 'koral' | 'nat';
/** 'eget' = brugerens eget uploadede billede (users.banner_key) */
export type BannerId = PresetBannerId | 'eget';
export const CUSTOM_BANNER = 'eget' as const;
export interface Banner { id: BannerId; label: string; photo?: { src: string; srcSet?: string }; className?: string; /** Videro-logo og navn på skovgrøn baggrund */ brand?: boolean }

const photo = (name: string) => ({
  src: `${BASE_PATH}/img/profil/${name}-800.webp`,
  srcSet: `${BASE_PATH}/img/profil/${name}-800.webp 800w, ${BASE_PATH}/img/profil/${name}-1600.webp 1600w`
});

export const BANNERS: readonly (Banner & { id: PresetBannerId })[] = [
  { id: 'videro', label: 'Videro', brand: true },
  { id: 'stativ', label: 'Tøjstativ', photo: photo('stativ') },
  { id: 'butik', label: 'Genbrugsbutik', photo: photo('butik') },
  { id: 'saelg', label: 'Garderobe', photo: photo('saelg') },
  { id: 'skov', label: 'Skovgrøn', className: 'bg-forest' },
  { id: 'lime', label: 'Lime', className: 'bg-lime' },
  { id: 'sand', label: 'Sand', className: 'bg-cream-200' },
  { id: 'koral', label: 'Koral', className: 'bg-coral-600' },
  { id: 'nat', label: 'Nat', className: 'bg-slate' }
];

export const DEFAULT_BANNER: PresetBannerId = 'videro';
export const isBannerId = (v: unknown): v is BannerId => v === CUSTOM_BANNER || (typeof v === 'string' && BANNERS.some((b) => b.id === v));
const preset = (id: string | null | undefined): Banner => BANNERS.find((b) => b.id === id) ?? BANNERS.find((b) => b.id === DEFAULT_BANNER)!;

/** Det banner, der skal vises: eget billede (hvis valgt og uploadet), ellers et af de faste – standard er Videro-banneret */
export function bannerById(id: string | null | undefined, customUrl?: string | null): Banner {
  if (id === CUSTOM_BANNER) return customUrl ? { id: CUSTOM_BANNER, label: 'Eget billede', photo: { src: customUrl } } : preset(DEFAULT_BANNER);
  return preset(id);
}
