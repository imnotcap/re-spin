/**
 * Eksempelkatalog til testversionen af hjemmesiden. Varer og sælgere er opdigtede,
 * men følger de rigtige regler: priser i hele kroner, gebyrer regnes af @respin/core.
 */
import type { IconName } from '@respin/ui';

import { CATEGORIES, CONDITIONS, CONDITION_HELP, type Category, type CategorySlug, type Condition } from './categories';

export { CATEGORIES, CONDITIONS, CONDITION_HELP, type Category, type CategorySlug, type Condition };

export interface Seller {
  id: string;
  name: string;
  city: string;
  rating: number;
  reviews: number;
  certified: boolean;
  /** Fx "inden for en time" */
  responds: string;
  memberSince: number;
  sold: number;
}

export const SELLERS: readonly Seller[] = [
  { id: 'sofie-vintage', name: 'sofie.vintage', city: 'København NV', rating: 4.9, reviews: 212, certified: true, responds: 'inden for en time', memberSince: 2024, sold: 340 },
  { id: 'mads-garderobe', name: 'mads_garderobe', city: 'Aarhus C', rating: 4.8, reviews: 87, certified: false, responds: 'inden for få timer', memberSince: 2025, sold: 96 },
  { id: 'linea-loppe', name: 'linea.loppe', city: 'Odense', rating: 5.0, reviews: 46, certified: true, responds: 'inden for en time', memberSince: 2025, sold: 58 },
  { id: 'jonasruns', name: 'jonasruns', city: 'Aalborg', rating: 4.7, reviews: 31, certified: false, responds: 'samme dag', memberSince: 2025, sold: 34 },
  { id: 'hjem-hos-ida', name: 'hjem.hos.ida', city: 'Roskilde', rating: 4.9, reviews: 128, certified: true, responds: 'inden for få timer', memberSince: 2024, sold: 151 },
  { id: 'familien-berg', name: 'familien.berg', city: 'Vejle', rating: 4.8, reviews: 64, certified: false, responds: 'samme dag', memberSince: 2025, sold: 77 },
  { id: 'nordic-sneaks', name: 'nordic.sneaks', city: 'Frederiksberg', rating: 4.9, reviews: 301, certified: true, responds: 'inden for en time', memberSince: 2024, sold: 412 },
  { id: 'kamilla-k', name: 'kamilla.k', city: 'Esbjerg', rating: 4.6, reviews: 19, certified: false, responds: 'inden for et døgn', memberSince: 2026, sold: 21 }
];

export interface Item {
  id: string;
  title: string;
  brand: string;
  category: CategorySlug;
  sub: string;
  size: string;
  condition: Condition;
  color: string;
  material?: string;
  /** Pris i hele kroner */
  price: number;
  /** Antal der har gemt varen */
  favorites: number;
  sellerId: string;
  /** Dage siden oprettelse */
  uploaded: number;
  /** Pakkestørrelse bestemmer fragtprisen */
  parcel: 'small' | 'medium';
  photos: number;
  vintage?: boolean;
  description: string;
  icon: IconName;
}

const I = (x: Item) => x;

export const ITEMS: readonly Item[] = [
  // Kvinder
  I({ id: '1001-ganni-uldjakke', title: 'Frakke med bindebælte', brand: 'Ganni', category: 'kvinder', sub: 'Jakker og frakker', size: 'M / 38', condition: 'Meget god', color: 'Kamel', material: '70 % uld, 30 % polyamid', price: 450, favorites: 38, sellerId: 'sofie-vintage', uploaded: 1, parcel: 'medium', photos: 1, description: 'Klassisk frakke med bindebælte og store revers. Brugt én vinter og passet godt på – ingen fnuller eller pletter.', icon: 'shirt' }),
  I({ id: '1002-samsoe-kjole', title: 'Kjole med blomsterprint', brand: 'Samsøe Samsøe', category: 'kvinder', sub: 'Kjoler', size: 'S / 36', condition: 'Ny med mærke', color: 'Rød', material: '100 % viskose', price: 320, favorites: 21, sellerId: 'linea-loppe', uploaded: 2, parcel: 'small', photos: 1, description: 'Feminin kjole med vidt skørt og blomsterprint. Aldrig brugt – mærket sidder stadig på.', icon: 'shirt' }),
  I({ id: '1003-arket-strik', title: 'Strikket poncho med frynser', brand: 'Arket', category: 'kvinder', sub: 'Strik', size: 'L / 40', condition: 'God', color: 'Creme', material: '100 % bomuld', price: 260, favorites: 14, sellerId: 'kamilla-k', uploaded: 4, parcel: 'small', photos: 1, description: 'Løs poncho i grov strik med frynser. Fin over en kjole om sommeren. Enkelte løse tråde i kanten, ellers fin stand.', icon: 'shirt' }),
  I({ id: '1004-levis-501-dame', title: 'Jeans med patches, høj talje', brand: "Levi's", category: 'kvinder', sub: 'Bukser og jeans', size: 'W28 L30', condition: 'Meget god', color: 'Blå', material: '100 % bomuld', price: 280, favorites: 52, sellerId: 'sofie-vintage', uploaded: 3, parcel: 'small', photos: 1, vintage: true, description: 'Vintage-jeans med påsyede patches og slid på knæene. Høj talje. Måler 36 cm over livet liggende fladt.', icon: 'shirt' }),
  I({ id: '1005-cos-sommerkjole', title: 'Hvid sommerkjole', brand: 'COS', category: 'kvinder', sub: 'Kjoler', size: 'S / 36', condition: 'Ny uden mærke', color: 'Hvid', material: '100 % bomuld', price: 190, favorites: 9, sellerId: 'linea-loppe', uploaded: 6, parcel: 'small', photos: 1, description: 'Let sommerkjole med off-shoulder og flæse. Aldrig brugt – mærket er klippet af.', icon: 'shirt' }),
  I({ id: '1006-rains-pufferjakke', title: 'Pufferjakke', brand: 'Rains', category: 'kvinder', sub: 'Jakker og frakker', size: 'S', condition: 'God', color: 'Gul', material: 'Polyester, vandafvisende', price: 650, favorites: 44, sellerId: 'kamilla-k', uploaded: 9, parcel: 'medium', photos: 1, description: 'Varm og vandafvisende pufferjakke i en glad gul farve. Lidt slid ved ærmekanterne.', icon: 'shirt' }),

  // Mænd
  I({ id: '2001-wood-wood-hoodie', title: 'Hættetrøje', brand: 'Wood Wood', category: 'maend', sub: 'Strik og sweatshirts', size: 'L', condition: 'Meget god', color: 'Grå', material: '100 % bomuld', price: 340, favorites: 27, sellerId: 'mads-garderobe', uploaded: 1, parcel: 'small', photos: 1, description: 'Tyk og blød hættetrøje med kængurulomme. Vasket på 30 grader og aldrig tørretumblet.', icon: 'hoodie' }),
  I({ id: '2002-mads-norgaard-sweatshirt', title: 'Sweatshirt med broderi', brand: 'Mads Nørgaard', category: 'maend', sub: 'Strik og sweatshirts', size: 'M', condition: 'God', color: 'Sort', material: '100 % bomuld', price: 290, favorites: 12, sellerId: 'mads-garderobe', uploaded: 5, parcel: 'small', photos: 1, description: 'Sort sweatshirt med lille broderet logo på brystet. Brugt et par gange, ingen fnuller.', icon: 'hoodie' }),
  I({ id: '2003-norse-projects-bomberjakke', title: 'Bomberjakke', brand: 'Norse Projects', category: 'maend', sub: 'Jakker', size: 'XL', condition: 'Meget god', color: 'Rust', material: 'Nylon', price: 720, favorites: 61, sellerId: 'jonasruns', uploaded: 2, parcel: 'medium', photos: 1, description: 'Let bomberjakke med ribkanter. Ingen fejl – sælges kun, fordi den er for stor.', icon: 'hoodie' }),
  I({ id: '2004-levis-511', title: '2 par jeans, 511 slim', brand: "Levi's", category: 'maend', sub: 'Bukser og jeans', size: 'W32 L32', condition: 'God', color: 'Blå og sort', material: '99 % bomuld, 1 % elastan', price: 220, favorites: 8, sellerId: 'mads-garderobe', uploaded: 8, parcel: 'small', photos: 1, description: 'To par slanke jeans – en blå og en sort. Let slid ved lommerne. Sælges samlet.', icon: 'hoodie' }),
  I({ id: '2005-arket-skjorte', title: 'Skjorte i chambray', brand: 'Arket', category: 'maend', sub: 'Skjorter og T-shirts', size: 'M', condition: 'Ny med mærke', color: 'Blå', material: '100 % bomuld', price: 240, favorites: 6, sellerId: 'kamilla-k', uploaded: 3, parcel: 'small', photos: 1, description: 'Skjorte i blød chambray med lille print. Ny med mærke – købt i forkert størrelse.', icon: 'shirt' }),

  // Børn
  I({ id: '3001-reima-heldragt', title: 'Heldragt i fleece med ører', brand: 'Reima', category: 'boern', sub: 'Overtøj', size: '74 cm', condition: 'Meget god', color: 'Grå', price: 380, favorites: 33, sellerId: 'familien-berg', uploaded: 1, parcel: 'medium', photos: 1, description: 'Blød og varm heldragt med hætte og ører. Brugt én vinter, ingen huller eller pletter.', icon: 'baby' }),
  I({ id: '3002-name-it-tshirt', title: 'T-shirt', brand: 'Name It', category: 'boern', sub: 'Tøj', size: '4 år', condition: 'Meget god', color: 'Rød', price: 150, favorites: 17, sellerId: 'familien-berg', uploaded: 4, parcel: 'small', photos: 1, description: 'Rød T-shirt i blød bomuld. Vasket mange gange, men farven holder.', icon: 'baby' }),
  I({ id: '3003-lego-classic', title: 'Klodser, ca. 790 stk.', brand: 'LEGO', category: 'boern', sub: 'Legetøj', size: 'One size', condition: 'God', color: 'Flerfarvet', price: 260, favorites: 24, sellerId: 'linea-loppe', uploaded: 2, parcel: 'medium', photos: 1, description: 'Masser af klodser i alle farver. Alle vasket. Leveres i pose.', icon: 'baby' }),
  I({ id: '3004-liewood-tshirts', title: 'T-shirts, 2 stk.', brand: 'Liewood', category: 'boern', sub: 'Tøj', size: '8 år', condition: 'God', color: 'Grå og hvid', price: 90, favorites: 5, sellerId: 'familien-berg', uploaded: 7, parcel: 'small', photos: 1, description: 'To T-shirts i økologisk bomuld. Små tegn på brug, ingen pletter.', icon: 'baby' }),
  I({ id: '3005-sunnylife-badering', title: 'Badering til baby', brand: 'Sunnylife', category: 'boern', sub: 'Legetøj', size: 'One size', condition: 'Meget god', color: 'Grøn', price: 120, favorites: 11, sellerId: 'kamilla-k', uploaded: 10, parcel: 'small', photos: 1, description: 'Badering med sæde til de mindste. Tæt – testet i badekarret. Bruges altid under opsyn.', icon: 'baby' }),

  // Sko
  I({ id: '4001-puma-sneakers', title: 'Lædersneakers', brand: 'Puma', category: 'sko', sub: 'Sneakers', size: '41', condition: 'Meget god', color: 'Hvid', material: 'Læder', price: 350, favorites: 74, sellerId: 'nordic-sneaks', uploaded: 1, parcel: 'medium', photos: 1, description: 'Hvide lædersneakers. Brugt få gange. Rengjort og klar. Original æske følger med.', icon: 'sneaker' }),
  I({ id: '4002-nike-air-max-1', title: 'Air Max 1', brand: 'Nike', category: 'sko', sub: 'Sneakers', size: '43', condition: 'God', color: 'Hvid og orange', price: 420, favorites: 39, sellerId: 'nordic-sneaks', uploaded: 3, parcel: 'medium', photos: 1, description: 'Klassiske Air Max 1. Lidt slid på hælen. Luftsålen er intakt.', icon: 'sneaker' }),
  I({ id: '4003-vans-old-skool', title: 'Old Skool', brand: 'Vans', category: 'sko', sub: 'Sneakers', size: '39', condition: 'Ny med mærke', color: 'Bordeaux', price: 560, favorites: 58, sellerId: 'nordic-sneaks', uploaded: 2, parcel: 'medium', photos: 1, description: 'Helt nye, aldrig prøvet udenfor. Æske og kvittering følger med.', icon: 'sneaker' }),
  I({ id: '4004-red-wing-stoevler', title: 'Snørestøvler i læder', brand: 'Red Wing', category: 'sko', sub: 'Støvler', size: '42', condition: 'God', color: 'Brun', material: 'Læder', price: 480, favorites: 29, sellerId: 'sofie-vintage', uploaded: 6, parcel: 'medium', photos: 1, vintage: false, description: 'Solide snørestøvler i brunt læder. Plejet med læderfedt. Sålerne har mange år tilbage.', icon: 'sneaker' }),
  I({ id: '4005-birkenstock-arizona', title: 'Arizona sandaler', brand: 'Birkenstock', category: 'sko', sub: 'Sandaler', size: '40', condition: 'Meget god', color: 'Taupe', material: 'Ruskind', price: 210, favorites: 4, sellerId: 'kamilla-k', uploaded: 11, parcel: 'medium', photos: 1, description: 'Komfortable sandaler med to remme. Brugt én sommer – fodsengen er formet, men pæn.', icon: 'sneaker' }),

  // Tasker
  I({ id: '5001-herschel-rygsaek', title: 'Rygsæk', brand: 'Herschel', category: 'tasker', sub: 'Rygsække', size: '20 l', condition: 'Meget god', color: 'Marineblå', price: 330, favorites: 41, sellerId: 'linea-loppe', uploaded: 2, parcel: 'medium', photos: 1, description: 'Rygsæk med polstret computerlomme. Ingen fejl.', icon: 'bag' }),
  I({ id: '5002-kurvetaske', title: 'Kurvetaske med læderhank', brand: 'Vintage', category: 'tasker', sub: 'Skuldertasker', size: 'One size', condition: 'God', color: 'Cognac', material: 'Flet og læder', price: 320, favorites: 36, sellerId: 'sofie-vintage', uploaded: 1, parcel: 'small', photos: 1, vintage: true, description: 'Kurvetaske med hank og lås i læder. Fundet i Paris. Lille mærke i bunden.', icon: 'bag' }),
  I({ id: '5003-becksondergaard-taske', title: 'Skuldertaske med kæde', brand: 'Becksöndergaard', category: 'tasker', sub: 'Skuldertasker', size: 'One size', condition: 'Ny uden mærke', color: 'Lyserød', material: 'Kunstlæder', price: 390, favorites: 15, sellerId: 'mads-garderobe', uploaded: 5, parcel: 'medium', photos: 1, description: 'Lille skuldertaske med kæderem. Brugt én gang til en fest. Som ny.', icon: 'bag' }),
  I({ id: '5004-markberg-pung', title: 'Pung i skind', brand: 'Markberg', category: 'tasker', sub: 'Punge', size: 'One size', condition: 'Meget god', color: 'Brun', material: 'Læder', price: 160, favorites: 7, sellerId: 'kamilla-k', uploaded: 8, parcel: 'small', photos: 1, description: 'Pung i brunt skind med plads til kort og sedler.', icon: 'wallet' }),

  // Accessories
  I({ id: '6001-pandora-armbaand', title: 'Armbånd med sten', brand: 'Pandora', category: 'accessories', sub: 'Smykker', size: '19 cm', condition: 'Meget god', color: 'Rosaguld', material: 'Forgyldt sølv', price: 240, favorites: 13, sellerId: 'linea-loppe', uploaded: 3, parcel: 'small', photos: 1, description: 'Pudset og klar. Leveres i original æske.', icon: 'gem' }),
  I({ id: '6002-skagen-ur', title: 'Ur med læderrem', brand: 'Skagen', category: 'accessories', sub: 'Ure', size: '38 mm', condition: 'God', color: 'Sølv og brun', price: 310, favorites: 10, sellerId: 'mads-garderobe', uploaded: 9, parcel: 'small', photos: 1, description: 'Enkelt ur med læderrem. Nyt batteri i september. Små brugsspor på remmen.', icon: 'clock' }),
  I({ id: '6003-carhartt-hue', title: 'Hue i ribstrik', brand: 'Carhartt WIP', category: 'accessories', sub: 'Huer', size: 'One size', condition: 'Meget god', color: 'Lyserød', material: 'Akryl', price: 120, favorites: 47, sellerId: 'sofie-vintage', uploaded: 4, parcel: 'small', photos: 1, description: 'Hue i ribstrik med lille logo. Brugt et par gange.', icon: 'gem' }),
  I({ id: '6004-ray-ban-wayfarer', title: 'New Wayfarer solbriller', brand: 'Ray-Ban', category: 'accessories', sub: 'Solbriller', size: 'One size', condition: 'God', color: 'Sort', price: 380, favorites: 19, sellerId: 'nordic-sneaks', uploaded: 7, parcel: 'small', photos: 1, description: 'Ægte Wayfarer med etui. Ingen ridser i glassene.', icon: 'eye' }),

  // Bolig
  I({ id: '7001-vintage-pendel', title: 'Industripendel i metal', brand: 'Vintage', category: 'bolig', sub: 'Lamper', size: 'Ø 40 cm', condition: 'God', color: 'Lysegrå', price: 650, favorites: 88, sellerId: 'hjem-hos-ida', uploaded: 2, parcel: 'medium', photos: 1, vintage: true, description: 'Pendel i lakeret metal fra 70’erne. Ny ledning og fatning, skiftet af elektriker.', icon: 'home' }),
  I({ id: '7002-kaehler-vase', title: 'Vase i keramik', brand: 'Kähler', category: 'bolig', sub: 'Dekoration', size: 'H 20 cm', condition: 'Meget god', color: 'Hvid', price: 260, favorites: 22, sellerId: 'hjem-hos-ida', uploaded: 1, parcel: 'medium', photos: 1, description: 'Stor vase i hvid keramik. Ingen skår eller revner. Sendes godt pakket.', icon: 'home' }),
  I({ id: '7003-hay-krus', title: 'Krus i porcelæn, 4 stk.', brand: 'Hay', category: 'bolig', sub: 'Køkken', size: '4 stk.', condition: 'Meget god', color: 'Hvid', price: 180, favorites: 31, sellerId: 'hjem-hos-ida', uploaded: 5, parcel: 'medium', photos: 1, description: 'Fire hvide krus. Ingen skår. Sælges samlet.', icon: 'home' }),
  I({ id: '7004-hay-skammel', title: 'Skammel i lyst træ', brand: 'Hay', category: 'bolig', sub: 'Møbler', size: 'H 45 cm', condition: 'God', color: 'Lyst træ', price: 450, favorites: 16, sellerId: 'linea-loppe', uploaded: 6, parcel: 'medium', photos: 1, description: 'Solid skammel. Lidt brugsspor på sædet. Kan også afhentes i Odense.', icon: 'home' }),
  I({ id: '7005-muuto-gulvlampe', title: 'Gulvlampe med vippeskærm', brand: 'Muuto', category: 'bolig', sub: 'Lamper', size: 'H 150 cm', condition: 'God', color: 'Antracit', price: 700, favorites: 9, sellerId: 'familien-berg', uploaded: 12, parcel: 'medium', photos: 1, vintage: true, description: 'Gulvlampe med justerbar skærm. Fungerer perfekt. Små ridser på foden.', icon: 'home' }),

  // Sport
  I({ id: '8001-nike-traeningssko', title: 'Træningssko', brand: 'Nike', category: 'sport', sub: 'Løb', size: '44', condition: 'Meget god', color: 'Neongul', price: 390, favorites: 12, sellerId: 'jonasruns', uploaded: 1, parcel: 'medium', photos: 1, description: 'Lette træningssko. Brugt ca. ti gange i fitnesscenteret.', icon: 'sneaker' }),
  I({ id: '8002-vintage-racercykel', title: 'Racercykel med singlespeed', brand: 'Vintage', category: 'sport', sub: 'Cykling', size: '56 cm', condition: 'Meget god', color: 'Hvid', price: 1800, favorites: 8, sellerId: 'jonasruns', uploaded: 4, parcel: 'medium', photos: 1, description: 'Let racercykel med singlespeed. Nye dæk og kæde. Kan også afhentes i Aalborg.', icon: 'ball' }),
  I({ id: '8003-fjallraven-jakke', title: 'Feltjakke med lommer', brand: 'Fjällräven', category: 'sport', sub: 'Outdoor', size: 'L', condition: 'God', color: 'Oliven', price: 890, favorites: 26, sellerId: 'jonasruns', uploaded: 3, parcel: 'medium', photos: 1, description: 'Slidstærk jakke med mange lommer. Imprægneret i år.', icon: 'hoodie' }),
  I({ id: '8004-samsung-smartwatch', title: 'Galaxy Watch', brand: 'Samsung', category: 'sport', sub: 'Løb', size: '40 mm', condition: 'Meget god', color: 'Hvid', price: 900, favorites: 34, sellerId: 'mads-garderobe', uploaded: 2, parcel: 'small', photos: 1, description: 'Nulstillet og klar. Oplader følger med. Skærmen er uden ridser.', icon: 'clock' })
];

/* ---------- Opslag ---------- */

const bySlug = new Map(CATEGORIES.map((c) => [c.slug, c]));
const byItemId = new Map(ITEMS.map((i) => [i.id, i]));
const bySellerId = new Map(SELLERS.map((s) => [s.id, s]));

export const getCategory = (slug: string): Category | undefined => bySlug.get(slug as CategorySlug);
export const getItem = (id: string): Item | undefined => byItemId.get(id);
export const getSeller = (id: string): Seller | undefined => bySellerId.get(id);
/** Sælgeren findes altid for katalogets egne varer (tjekkes af en test) */
export const sellerOf = (item: Item): Seller => bySellerId.get(item.sellerId)!;
export const categoryOf = (item: Item): Category => bySlug.get(item.category)!;

export const itemsIn = (slug: CategorySlug): Item[] => ITEMS.filter((i) => i.category === slug);
export const itemsBySeller = (sellerId: string): Item[] => ITEMS.filter((i) => i.sellerId === sellerId);
export const countIn = (slug: CategorySlug): number => itemsIn(slug).length;

/** Nyeste først; ved samme dag: flest favoritter først (stabil rækkefølge) */
export const newest = (n = ITEMS.length): Item[] =>
  [...ITEMS].sort((a, b) => a.uploaded - b.uploaded || b.favorites - a.favorites || a.id.localeCompare(b.id)).slice(0, n);
export const mostPopular = (n = ITEMS.length): Item[] =>
  [...ITEMS].sort((a, b) => b.favorites - a.favorites || a.id.localeCompare(b.id)).slice(0, n);
export const fromCertified = (n = ITEMS.length): Item[] => newest().filter((i) => sellerOf(i).certified).slice(0, n);

/** Lignende varer: samme kategori (samme underkategori først), aldrig varen selv */
export function similarTo(item: Item, n = 6): Item[] {
  return ITEMS.filter((i) => i.id !== item.id && i.category === item.category)
    .sort((a, b) => Number(b.sub === item.sub) - Number(a.sub === item.sub) || b.favorites - a.favorites)
    .slice(0, n);
}

/** Mærker med flest varer (mindst 2), derefter alfabetisk */
export function popularBrands(n = 12, slug?: CategorySlug): { brand: string; count: number }[] {
  const m = new Map<string, number>();
  for (const i of ITEMS) if (i.brand !== 'Vintage' && (!slug || i.category === slug)) m.set(i.brand, (m.get(i.brand) ?? 0) + 1);
  return [...m].map(([brand, count]) => ({ brand, count }))
    .sort((a, b) => b.count - a.count || a.brand.localeCompare(b.brand, 'da'))
    .slice(0, n);
}

/**
 * Normaliser til søgning: små bogstaver, uden accenter (é → e) men med å (U+030A bevares),
 * apostroffer og punktummer fjernes ("Levi's" → "levis", "Dr. Martens" → "dr martens"), øvrig tegnsætning bliver mellemrum.
 */
export const normalize = (s: string): string =>
  s.toLocaleLowerCase('da-DK').normalize('NFKD').replace(/[\u0300-\u0309\u030b-\u036f]/g, '').normalize('NFC')
    .replace(/[.'\u2019`\u00b4]/g, '').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();

/** Søg i titel, mærke, kategori, underkategori, farve og stand. Alle ord skal findes (AND). */
export function searchItems(query: string): Item[] {
  const words = normalize(query).split(' ').filter(Boolean);
  if (words.length === 0) return newest();
  return newest().filter((i) => {
    const hay = normalize([i.title, i.brand, categoryOf(i).label, i.sub, i.color, i.condition, i.vintage ? 'vintage' : ''].join(' '));
    return words.every((w) => hay.includes(w));
  });
}

/** "I dag", "I går", "For 3 dage siden" */
export const uploadedLabel = (days: number): string => (days <= 0 ? 'I dag' : days === 1 ? 'I går' : `For ${days} dage siden`);

/** Det et produktkort skal bruge (serialiserbart – kan sendes fra server til klient) */
export function toCard(item: Item) {
  const s = sellerOf(item);
  return {
    id: item.id, title: item.title, brand: item.brand, size: item.size, condition: item.condition,
    price: item.price, favorites: item.favorites, icon: item.icon, vintage: item.vintage,
    seller: { name: s.name, certified: s.certified }
  };
}

/** Det en filtrerbar liste skal bruge */
export const toBrowse = (item: Item) => ({ ...toCard(item), category: item.category, sub: item.sub, uploaded: item.uploaded });

/** Lille opsummering pr. kategori til menuen (antal varer, populære mærker) – beregnes på serveren */
export type MenuMeta = Record<CategorySlug, { count: number; brands: string[] }>;
export const menuMeta = (): MenuMeta =>
  Object.fromEntries(CATEGORIES.map((c) => [c.slug, { count: countIn(c.slug), brands: popularBrands(6, c.slug).map((b) => b.brand) }])) as MenuMeta;
