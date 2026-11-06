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
  I({ id: '1001-ganni-uldjakke', title: 'Uldjakke i ternet mønster', brand: 'Ganni', category: 'kvinder', sub: 'Jakker og frakker', size: 'M / 38', condition: 'Meget god', color: 'Brun', material: '70 % uld, 30 % polyamid', price: 450, favorites: 38, sellerId: 'sofie-vintage', uploaded: 1, parcel: 'medium', photos: 5, description: 'Lun uldjakke med store lommer. Brugt én vinter og passet godt på – ingen fnuller eller pletter. Lidt oversize i pasformen.', icon: 'shirt' }),
  I({ id: '1002-samsoe-kjole', title: 'Midikjole med blomsterprint', brand: 'Samsøe Samsøe', category: 'kvinder', sub: 'Kjoler', size: 'S / 36', condition: 'Ny med mærke', color: 'Grøn', material: '100 % viskose', price: 320, favorites: 21, sellerId: 'linea-loppe', uploaded: 2, parcel: 'small', photos: 4, description: 'Aldrig brugt – mærket sidder stadig på. Købt til et bryllup, men endte med at vælge en anden.', icon: 'shirt' }),
  I({ id: '1003-arket-strik', title: 'Strikket cardigan i merinould', brand: 'Arket', category: 'kvinder', sub: 'Strik', size: 'L / 40', condition: 'God', color: 'Creme', material: '100 % merinould', price: 260, favorites: 14, sellerId: 'kamilla-k', uploaded: 4, parcel: 'small', photos: 3, description: 'Blød cardigan med perlemorsknapper. Lidt fnuller under ærmerne (se billede 3), ellers fin stand.', icon: 'shirt' }),
  I({ id: '1004-levis-501-dame', title: '501 jeans, lige ben', brand: "Levi's", category: 'kvinder', sub: 'Bukser og jeans', size: 'W28 L30', condition: 'Meget god', color: 'Blå', material: '100 % bomuld', price: 280, favorites: 52, sellerId: 'sofie-vintage', uploaded: 3, parcel: 'small', photos: 4, vintage: true, description: 'Vintage 501 fra 90’erne i en flot, falmet vask. Høj talje. Måler 36 cm over livet liggende fladt.', icon: 'shirt' }),
  I({ id: '1005-cos-skjorte', title: 'Oversize skjorte i poplin', brand: 'COS', category: 'kvinder', sub: 'Toppe og bluser', size: 'XS / 34', condition: 'Ny uden mærke', color: 'Hvid', material: '100 % økologisk bomuld', price: 190, favorites: 9, sellerId: 'linea-loppe', uploaded: 6, parcel: 'small', photos: 2, description: 'Sprød hvid skjorte, aldrig brugt. Mærket er klippet af, men den er helt ny.', icon: 'shirt' }),
  I({ id: '1006-stutterheim-regnfrakke', title: 'Regnfrakke Stockholm', brand: 'Stutterheim', category: 'kvinder', sub: 'Jakker og frakker', size: 'S', condition: 'God', color: 'Sort', material: 'Gummieret bomuld', price: 650, favorites: 44, sellerId: 'kamilla-k', uploaded: 9, parcel: 'medium', photos: 4, description: 'Klassisk regnfrakke, helt tæt. Lidt slid ved ærmekanterne, vist på billederne.', icon: 'shirt' }),

  // Mænd
  I({ id: '2001-wood-wood-hoodie', title: 'Hættetrøje med logo', brand: 'Wood Wood', category: 'maend', sub: 'Strik og sweatshirts', size: 'L', condition: 'Meget god', color: 'Grå', material: '100 % bomuld', price: 340, favorites: 27, sellerId: 'mads-garderobe', uploaded: 1, parcel: 'small', photos: 3, description: 'Tyk og blød hættetrøje. Vasket på 30 grader og aldrig tørretumblet.', icon: 'hoodie' }),
  I({ id: '2002-mads-norgaard-strik', title: 'Rullekrave i lammeuld', brand: 'Mads Nørgaard', category: 'maend', sub: 'Strik og sweatshirts', size: 'M', condition: 'God', color: 'Marineblå', material: '100 % lammeuld', price: 290, favorites: 12, sellerId: 'mads-garderobe', uploaded: 5, parcel: 'small', photos: 3, description: 'Varm rullekrave. Brugt et par vintre, enkelte fnuller, ingen huller.', icon: 'hoodie' }),
  I({ id: '2003-patagonia-fleece', title: 'Retro-X fleecejakke', brand: 'Patagonia', category: 'maend', sub: 'Jakker', size: 'XL', condition: 'Meget god', color: 'Natur', material: 'Genanvendt polyester', price: 720, favorites: 61, sellerId: 'jonasruns', uploaded: 2, parcel: 'medium', photos: 5, description: 'Den klassiske Retro-X. Vindtæt og varm. Ingen fejl – sælges kun, fordi den er for stor.', icon: 'hoodie' }),
  I({ id: '2004-levis-511', title: '511 slim jeans', brand: "Levi's", category: 'maend', sub: 'Bukser og jeans', size: 'W32 L32', condition: 'God', color: 'Mørkeblå', material: '99 % bomuld, 1 % elastan', price: 220, favorites: 8, sellerId: 'mads-garderobe', uploaded: 8, parcel: 'small', photos: 3, description: 'Slanke jeans i mørk vask. Let slid ved lommerne.', icon: 'hoodie' }),
  I({ id: '2005-arket-skjorte', title: 'Oxfordskjorte', brand: 'Arket', category: 'maend', sub: 'Skjorter og T-shirts', size: 'M', condition: 'Ny med mærke', color: 'Lyseblå', material: '100 % bomuld', price: 240, favorites: 6, sellerId: 'kamilla-k', uploaded: 3, parcel: 'small', photos: 2, description: 'Ny skjorte med mærke. Købt i forkert størrelse, og byttefristen var udløbet.', icon: 'shirt' }),

  // Børn
  I({ id: '3001-reima-flyverdragt', title: 'Flyverdragt, vandtæt', brand: 'Reima', category: 'boern', sub: 'Overtøj', size: '98 cm', condition: 'Meget god', color: 'Mørkegrøn', price: 380, favorites: 33, sellerId: 'familien-berg', uploaded: 1, parcel: 'medium', photos: 4, description: 'Brugt én vinter af storebror. Helt tæt, alle lynlåse virker, reflekser intakte.', icon: 'baby' }),
  I({ id: '3002-konges-slojd-kjole', title: 'Kjole med flæser', brand: 'Konges Sløjd', category: 'boern', sub: 'Tøj', size: '2 år', condition: 'Ny uden mærke', color: 'Lyserød', price: 150, favorites: 17, sellerId: 'familien-berg', uploaded: 4, parcel: 'small', photos: 3, description: 'Aldrig brugt – fik to i gave.', icon: 'baby' }),
  I({ id: '3003-lego-classic', title: 'Classic-kasse, 790 klodser', brand: 'LEGO', category: 'boern', sub: 'Legetøj', size: 'One size', condition: 'God', color: 'Flerfarvet', price: 260, favorites: 24, sellerId: 'linea-loppe', uploaded: 2, parcel: 'medium', photos: 3, description: 'Alle klodser vasket. Vejledningen følger med. Kassen har lidt slid i hjørnerne.', icon: 'baby' }),
  I({ id: '3004-liewood-sweatshirt', title: 'Sweatshirt i økologisk bomuld', brand: 'Liewood', category: 'boern', sub: 'Tøj', size: '110 cm', condition: 'God', color: 'Sennep', price: 90, favorites: 5, sellerId: 'familien-berg', uploaded: 7, parcel: 'small', photos: 2, description: 'Blød sweatshirt. En lille plet på ærmet (se billede 2).', icon: 'baby' }),
  I({ id: '3005-polarn-regnsaet', title: 'Regnsæt, jakke og bukser', brand: 'Polarn O. Pyret', category: 'boern', sub: 'Overtøj', size: '104 cm', condition: 'Meget god', color: 'Gul', price: 180, favorites: 11, sellerId: 'kamilla-k', uploaded: 10, parcel: 'medium', photos: 3, description: 'Tæt regnsæt med seler. Ingen huller eller reparationer.', icon: 'baby' }),

  // Sko
  I({ id: '4001-adidas-samba', title: 'Samba OG', brand: 'Adidas', category: 'sko', sub: 'Sneakers', size: '41', condition: 'Meget god', color: 'Hvid', material: 'Læder og ruskind', price: 350, favorites: 74, sellerId: 'nordic-sneaks', uploaded: 1, parcel: 'medium', photos: 5, description: 'Brugt få gange. Rengjort og klar. Original æske følger med.', icon: 'sneaker' }),
  I({ id: '4002-nike-air-max-90', title: 'Air Max 90', brand: 'Nike', category: 'sko', sub: 'Sneakers', size: '43', condition: 'God', color: 'Hvid og grå', price: 420, favorites: 39, sellerId: 'nordic-sneaks', uploaded: 3, parcel: 'medium', photos: 5, description: 'Klassiske Air Max 90. Lidt slid på hælen, vist på billede 4. Luftsålen er intakt.', icon: 'sneaker' }),
  I({ id: '4003-new-balance-550', title: '550', brand: 'New Balance', category: 'sko', sub: 'Sneakers', size: '39', condition: 'Ny med mærke', color: 'Hvid og grøn', price: 560, favorites: 58, sellerId: 'nordic-sneaks', uploaded: 2, parcel: 'medium', photos: 4, description: 'Helt nye, aldrig prøvet udenfor. Æske og kvittering følger med.', icon: 'sneaker' }),
  I({ id: '4004-dr-martens-1460', title: '1460 snørestøvler', brand: 'Dr. Martens', category: 'sko', sub: 'Støvler', size: '38', condition: 'God', color: 'Sort', material: 'Læder', price: 480, favorites: 29, sellerId: 'sofie-vintage', uploaded: 6, parcel: 'medium', photos: 4, vintage: true, description: 'Gået til og bløde. Plejet med læderfedt. Sålerne har mange år tilbage.', icon: 'sneaker' }),
  I({ id: '4005-ecco-sandaler', title: 'Sandaler med velcro', brand: 'Ecco', category: 'sko', sub: 'Sandaler', size: '40', condition: 'Meget god', color: 'Brun', price: 210, favorites: 4, sellerId: 'kamilla-k', uploaded: 11, parcel: 'medium', photos: 3, description: 'Komfortable sandaler, brugt én sommer.', icon: 'sneaker' }),

  // Tasker
  I({ id: '5001-kanken-rygsaek', title: 'Kånken rygsæk', brand: 'Fjällräven', category: 'tasker', sub: 'Rygsække', size: '16 l', condition: 'Meget god', color: 'Okker', price: 330, favorites: 41, sellerId: 'linea-loppe', uploaded: 2, parcel: 'medium', photos: 4, description: 'Rygsæk i fin stand. Siddepuden følger med.', icon: 'bag' }),
  I({ id: '5002-ruskindstaske', title: 'Skuldertaske i ruskind', brand: 'Vintage', category: 'tasker', sub: 'Skuldertasker', size: 'One size', condition: 'God', color: 'Cognac', material: 'Ruskind', price: 320, favorites: 36, sellerId: 'sofie-vintage', uploaded: 1, parcel: 'small', photos: 5, vintage: true, description: 'Fundet i Paris. Blød ruskind med frynser og justerbar rem. Lille mærke på bagsiden.', icon: 'bag' }),
  I({ id: '5003-rains-weekendtaske', title: 'Weekendtaske, vandtæt', brand: 'Rains', category: 'tasker', sub: 'Skuldertasker', size: '30 l', condition: 'Ny uden mærke', color: 'Sort', price: 390, favorites: 15, sellerId: 'mads-garderobe', uploaded: 5, parcel: 'medium', photos: 3, description: 'Brugt én gang på en weekendtur. Som ny.', icon: 'bag' }),
  I({ id: '5004-markberg-pung', title: 'Pung i skind', brand: 'Markberg', category: 'tasker', sub: 'Punge', size: 'One size', condition: 'Meget god', color: 'Sort', material: 'Læder', price: 160, favorites: 7, sellerId: 'kamilla-k', uploaded: 8, parcel: 'small', photos: 2, description: 'Lille pung med plads til kort og mønter.', icon: 'wallet' }),

  // Accessories
  I({ id: '6001-pandora-armbaand', title: 'Armbånd i sølv', brand: 'Pandora', category: 'accessories', sub: 'Smykker', size: '19 cm', condition: 'Meget god', color: 'Sølv', material: 'Sterlingsølv', price: 240, favorites: 13, sellerId: 'linea-loppe', uploaded: 3, parcel: 'small', photos: 3, description: 'Pudset og klar. Leveres i original æske.', icon: 'gem' }),
  I({ id: '6002-skagen-ur', title: 'Ur med milanaise-rem', brand: 'Skagen', category: 'accessories', sub: 'Ure', size: '38 mm', condition: 'God', color: 'Sølv', price: 310, favorites: 10, sellerId: 'mads-garderobe', uploaded: 9, parcel: 'small', photos: 3, description: 'Nyt batteri i september. Små ridser på glasset.', icon: 'clock' }),
  I({ id: '6003-acne-toerklaede', title: 'Tørklæde i uld', brand: 'Acne Studios', category: 'accessories', sub: 'Tørklæder', size: 'One size', condition: 'Meget god', color: 'Grå', material: '100 % uld', price: 520, favorites: 47, sellerId: 'sofie-vintage', uploaded: 4, parcel: 'small', photos: 3, description: 'Det store, bløde tørklæde. Ingen fnuller.', icon: 'gem' }),
  I({ id: '6004-ray-ban-wayfarer', title: 'Wayfarer solbriller', brand: 'Ray-Ban', category: 'accessories', sub: 'Solbriller', size: 'One size', condition: 'God', color: 'Sort', price: 380, favorites: 19, sellerId: 'nordic-sneaks', uploaded: 7, parcel: 'small', photos: 3, description: 'Ægte Wayfarer med etui. Ingen ridser i glassene.', icon: 'eye' }),

  // Bolig
  I({ id: '7001-ph5-lampe', title: 'PH 5 pendel', brand: 'Louis Poulsen', category: 'bolig', sub: 'Lamper', size: 'Ø 50 cm', condition: 'God', color: 'Hvid', price: 2400, favorites: 88, sellerId: 'hjem-hos-ida', uploaded: 2, parcel: 'medium', photos: 5, vintage: true, description: 'Original PH 5 fra 80’erne. Enkelte små buler i den øverste skærm (se billede 4). Ledning og fatning skiftet af elektriker.', icon: 'home' }),
  I({ id: '7002-kaehler-vase', title: 'Hammershøi vase', brand: 'Kähler', category: 'bolig', sub: 'Dekoration', size: 'H 20 cm', condition: 'Meget god', color: 'Hvid', price: 260, favorites: 22, sellerId: 'hjem-hos-ida', uploaded: 1, parcel: 'medium', photos: 3, description: 'Ingen skår eller revner. Sendes godt pakket.', icon: 'home' }),
  I({ id: '7003-royal-copenhagen-kopper', title: '4 kaffekopper, Musselmalet', brand: 'Royal Copenhagen', category: 'bolig', sub: 'Køkken', size: '4 stk.', condition: 'Meget god', color: 'Blå og hvid', price: 600, favorites: 31, sellerId: 'hjem-hos-ida', uploaded: 5, parcel: 'medium', photos: 4, description: 'Første sortering. Ingen skår. Sælges samlet.', icon: 'home' }),
  I({ id: '7004-hay-skammel', title: 'Skammel i eg', brand: 'Hay', category: 'bolig', sub: 'Møbler', size: 'H 45 cm', condition: 'God', color: 'Eg', price: 450, favorites: 16, sellerId: 'linea-loppe', uploaded: 6, parcel: 'medium', photos: 3, description: 'Solid skammel. Lidt brugsspor på sædet. Kan også afhentes i Odense.', icon: 'home' }),
  I({ id: '7005-stelton-termokande', title: 'EM77 termokande', brand: 'Stelton', category: 'bolig', sub: 'Køkken', size: '1 l', condition: 'God', color: 'Stål', price: 220, favorites: 9, sellerId: 'familien-berg', uploaded: 12, parcel: 'medium', photos: 3, vintage: true, description: 'Holder varmen fint. Ny pakning i låget.', icon: 'home' }),

  // Sport
  I({ id: '8001-asics-loebesko', title: 'Gel-Nimbus løbesko', brand: 'Asics', category: 'sport', sub: 'Løb', size: '44', condition: 'Meget god', color: 'Blå', price: 390, favorites: 12, sellerId: 'jonasruns', uploaded: 1, parcel: 'medium', photos: 4, description: 'Løbet ca. 80 km. Masser af dæmpning tilbage.', icon: 'sneaker' }),
  I({ id: '8002-rapha-cykeltroje', title: 'Cykeltrøje Core', brand: 'Rapha', category: 'sport', sub: 'Cykling', size: 'M', condition: 'Meget god', color: 'Sort', price: 330, favorites: 8, sellerId: 'jonasruns', uploaded: 4, parcel: 'small', photos: 3, description: 'Brugt en sæson. Vasket efter anvisning.', icon: 'ball' }),
  I({ id: '8003-haglofs-skaljakke', title: 'Skaljakke med Gore-Tex', brand: 'Haglöfs', category: 'sport', sub: 'Outdoor', size: 'L', condition: 'God', color: 'Rød', price: 890, favorites: 26, sellerId: 'jonasruns', uploaded: 3, parcel: 'medium', photos: 5, description: 'Helt tæt. Imprægneret i år. Lidt slid på skuldrene fra rygsæk.', icon: 'hoodie' }),
  I({ id: '8004-garmin-ur', title: 'Forerunner 255 GPS-ur', brand: 'Garmin', category: 'sport', sub: 'Løb', size: '46 mm', condition: 'Meget god', color: 'Sort', price: 1100, favorites: 34, sellerId: 'mads-garderobe', uploaded: 2, parcel: 'small', photos: 4, description: 'Nulstillet og klar. Oplader følger med. Skærmen er uden ridser.', icon: 'clock' })
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
export function popularBrands(n = 12): { brand: string; count: number }[] {
  const m = new Map<string, number>();
  for (const i of ITEMS) if (i.brand !== 'Vintage') m.set(i.brand, (m.get(i.brand) ?? 0) + 1);
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
