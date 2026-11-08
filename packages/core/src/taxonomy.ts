/**
 * Kategoritræet (kategori → sektion → underkategori, med eksempler) og stand. Delt mellem hjemmesiden og admin.
 * Ikonnavne er strenge her (core kender ikke UI-kittet); hjemmesiden typer dem som ikoner i lib/categories.ts.
 */
type IconName = string;

export type CategorySlug = 'kvinder' | 'maend' | 'boern' | 'hjem' | 'underholdning' | 'kaeledyr';

/** En sektion i megamenuen, fx "Sko" under Kvinder */
export interface CategoryGroup {
  label: string;
  icon: IconName;
  /** Underkategorier (filtre, annoncens "Type") – unikke inden for kategorien */
  items: readonly string[];
  /** Eksempler på, hvad en underkategori dækker (hjælpetekst og søgeord) */
  examples: Readonly<Record<string, string>>;
}

export interface Category {
  slug: CategorySlug;
  label: string;
  icon: IconName;
  /** Kort tekst til kategorisiden */
  intro: string;
  /** Sektioner med underkategorier (megamenu og mobilmenu) */
  groups: readonly CategoryGroup[];
  /** Alle underkategorier i kategorien (filtre, validering af annoncer) – udledt af sektionerne */
  subs: readonly string[];
}

/** Underkategori med valgfri eksempler: s('Kjoler', 'Maxikjoler, festkjoler') */
type Sub = readonly [label: string, examples?: string];
const s = (label: string, examples?: string): Sub => [label, examples];

const group = (label: string, icon: IconName, subs: readonly Sub[]): CategoryGroup => ({
  label, icon,
  items: subs.map(([l]) => l),
  examples: Object.fromEntries(subs.filter(([, e]) => e).map(([l, e]) => [l, e!]))
});

const cat = (c: Omit<Category, 'subs'>): Category => ({ ...c, subs: c.groups.flatMap((g) => g.items) });

export const CATEGORIES: readonly Category[] = [
  cat({ slug: 'kvinder', label: 'Kvinder', icon: 'shirt', intro: 'Tøj, sko, tasker, accessories og skønhed fra danske og nordiske mærker.', groups: [
    group('Tøj', 'shirt', [
      s('Frakker og jakker', 'Trenchcoats, dunjakker, uldfrakker, læderjakker, veste, regntøj'),
      s('Trøjer og strik', 'Cardigans, strikbluser, hættetrøjer, sweatshirts, rullekraver'),
      s('Toppe og t-shirts', 'T-shirts, toppe, langærmede toppe, poloshirts'),
      s('Skjorter og bluser', 'Klassiske skjorter, tunikaer, ærmeløse bluser'),
      s('Kjoler', 'Hverdagskjoler, maxikjoler, festkjoler, cocktailkjoler, skjortekjoler, vintagekjoler'),
      s('Nederdele', 'Mini, midi, maxi, plisserede nederdele, denimnederdele'),
      s('Bukser og leggings', 'Jeans, habitbukser, chinos, læderbukser, leggings, cargobukser'),
      s('Shorts', 'Denimshorts, højtaljede shorts, bermudashorts, cykelshorts'),
      s('Jumpsuits og playsuits', 'Lange jumpsuits, korte playsuits, smækbukser'),
      s('Badetøj', 'Bikinier, badedragter, strandtøj/kimonoer'),
      s('Undertøj og nattøj', 'BH’er, trusser, nattøj, pyjamas, morgenkåber, shapewear'),
      s('Dragter og blazere', 'Blazere, buksedragter, nederdelesæt'),
      s('Sportstøj', 'Sports-BH’er, tights, træningstoppe, skijakker og skitøj'),
      s('Graviditetstøj', 'Graviditetskjoler, graviditetsbukser, amme-BH’er'),
      s('Kostumer og særligt tøj')
    ]),
    group('Sko', 'sneaker', [
      s('Støvler', 'Ankelstøvler, knæhøje støvler, chelsea boots, cowboystøvler, gummistøvler'),
      s('Sneakers', 'Lave sneakers, høje sneakers, platformsneakers'),
      s('Flade sko', 'Ballerinasko, loafers, espadrillos, sejlersko'),
      s('Hæle', 'Stiletter, blokhæle, pumps, kilehæle, mules'),
      s('Sandaler og klipklappere'),
      s('Sportssko', 'Løbesko, vandresko, træningssko'),
      s('Hjemmesko')
    ]),
    group('Tasker', 'bag', [
      s('Håndtasker og skuldertasker'),
      s('Crossbody-tasker'),
      s('Rygsække'),
      s('Shoppere og muleposer'),
      s('Clutches og aftentasker'),
      s('Rejsetasker og kufferter'),
      s('Bæltetasker'),
      s('Punge og kortholdere')
    ]),
    group('Accessories', 'gem', [
      s('Smykker', 'Halskæder, armbånd, øreringe, ringe, brocher'),
      s('Ure'),
      s('Solbriller og briller'),
      s('Bælter'),
      s('Tørklæder og sjaler'),
      s('Hatte, kasketter og huer'),
      s('Handsker og vanter'),
      s('Hårtilbehør', 'Klemmer, elastikker, hårbøjler'),
      s('Paraplyer')
    ]),
    group('Skønhed', 'sparkle', [
      s('Makeup', 'Ansigt, læber, øjne, bryn, makeuppaletter'),
      s('Hudpleje', 'Ansigtsrens, cremer, serummer, masker, solbeskyttelse'),
      s('Parfumer og dufte'),
      s('Kropspleje', 'Cremer, scrubs, solpleje'),
      s('Hårpleje og styling', 'Shampoo, hårmasker, stylere, glattejern, føntørrere'),
      s('Neglepleje', 'Neglelak, UV-lamper, file'),
      s('Skønhedsredskaber', 'Børster, svampe, pincetter')
    ])
  ] }),
  cat({ slug: 'maend', label: 'Mænd', icon: 'hoodie', intro: 'Jakker, strik, jeans, sneakers og accessories – brugt, men langt fra brugt op.', groups: [
    group('Tøj', 'hoodie', [
      s('Frakker og jakker', 'Vinterjakker, overgangsjakker, læderjakker, bomberjakker, regntøj'),
      s('Trøjer og strik', 'Hættetrøjer, sweatshirts, cardigans, striktrøjer, rullekraver'),
      s('T-shirts og poloshirts', 'Kortærmede, langærmede, tanktops, poloer'),
      s('Skjorter', 'Casual skjorter, formelle skjorter, denimskjorter, kortærmede skjorter'),
      s('Bukser', 'Jeans, chinos, cargobukser, joggingbukser, habitbukser'),
      s('Shorts', 'Denimshorts, badeshorts, cargoshorts, træningsshorts'),
      s('Jakkesæt og blazere', 'Blazere, veste, komplette habit-sæt, smoking'),
      s('Undertøj og strømper', 'Boxershorts, underbukser, tennissokker, uldsokker'),
      s('Nattøj og loungewear', 'Pyjamasbukser, morgenkåber'),
      s('Badetøj'),
      s('Sportstøj', 'Løbetøj, fodboldtrøjer, fitnesstøj, skitøj'),
      s('Kostumer og uniformer')
    ]),
    group('Sko', 'sneaker', [
      s('Sneakers', 'Streetwear, løbesneakers, retrosneakers'),
      s('Støvler', 'Støvletter, snørestøvler, chelsea boots, vandrestøvler'),
      s('Formelle sko', 'Derby, oxford, brogues, loafers'),
      s('Sandaler og slippers'),
      s('Sportssko', 'Fodboldstøvler, basketballsko, løbesko'),
      s('Hjemmesko')
    ]),
    group('Tasker og rygsække', 'bag', [
      s('Rygsække', 'Hverdagsrygsække, computertasker'),
      s('Skuldertasker og computertasker'),
      s('Bæltetasker og crossbody-tasker'),
      s('Sportstasker og weekendtasker'),
      s('Kufferter'),
      s('Punge og kortholdere')
    ]),
    group('Accessories', 'gem', [
      s('Ure'),
      s('Bælter'),
      s('Kasketter, huer og hatte'),
      s('Solbriller'),
      s('Tørklæder og handsker'),
      s('Slips, butterflies og lommeklude'),
      s('Smykker', 'Herreringe, halskæder, armbånd, manchetknapper')
    ]),
    group('Grooming og skønhed', 'sparkle', [
      s('Parfumer og aftershaves'),
      s('Skægpleje', 'Olier, trimmere, barbersæt'),
      s('Hårstyling og kropspleje')
    ])
  ] }),
  cat({ slug: 'boern', label: 'Børn', icon: 'baby', intro: 'Børn vokser hurtigt. Køb og sælg tøj fra 0 måneder til 14+ år, udstyr og legetøj videre.', groups: [
    group('Piger', 'shirt', [
      s('Kjoler og nederdele'),
      s('Toppe, t-shirts og bluser'),
      s('Bukser, jeans og leggings'),
      s('Trøjer og cardigans'),
      s('Overtøj og flyverdragter'),
      s('Badetøj, undertøj og nattøj til piger'),
      s('Sko til piger', 'Sneakers, støvler, sandaler, hjemmesko')
    ]),
    group('Drenge', 'hoodie', [
      s('T-shirts, poloshirts og skjorter'),
      s('Bukser, jeans og joggingbukser'),
      s('Trøjer, hoodies og strik'),
      s('Overtøj, jakker og flyverdragter'),
      s('Badetøj, undertøj og nattøj til drenge'),
      s('Sko til drenge', 'Sneakers, gummistøvler, støvler, sandaler')
    ]),
    group('Babyudstyr og pleje', 'baby', [
      s('Barnevogne, klapvogne og tilbehør'),
      s('Bilsæder og autostole'),
      s('Bæreseler og vikler'),
      s('Børnemøbler', 'Tremmesenge, pusleborde, højstole'),
      s('Amning og spisning', 'Sutter, sutteflasker, brystpumper, hagesmække'),
      s('Bleer og pusleudstyr'),
      s('Badeslag og babybadekar'),
      s('Babysikkerhed', 'Babyalarmer, gitterlåger')
    ]),
    group('Legetøj og spil', 'ball', [
      s('Babylegetøj og rangler'),
      s('Dukker, bamser og tøjdyr'),
      s('Byggeklodser og LEGO'),
      s('Biler, tog og fjernstyret legetøj'),
      s('Brætspil, puslespil og kortspil'),
      s('Udendørs legetøj', 'Løbecykler, løbehjul, sandkasselegetøj'),
      s('Udklædningstøj og rollespil'),
      s('Kreativ leg og tegneudstyr')
    ]),
    group('Skoleartikler', 'package', [
      s('Skoletasker og penalhuse'),
      s('Madkasser og drikkedunke')
    ])
  ] }),
  cat({ slug: 'hjem', label: 'Hjem', icon: 'home', intro: 'Tekstiler, dekoration, køkken og lamper med historie.', groups: [
    group('Tekstiler og sengetøj', 'home2', [
      s('Sengetøj, dynebetræk og lagner'),
      s('Puder, sofapuder og pudebetræk'),
      s('Plaider og tæpper'),
      s('Gardiner'),
      s('Håndklæder og bademåtter'),
      s('Duge, dækkeservietter og stofservietter')
    ]),
    group('Boligindretning og dekoration', 'home', [
      s('Vaser og urtepotteskjulere'),
      s('Stearinlys, lysestager og duftpinde'),
      s('Spejle'),
      s('Rammer, plakater og vægbilleder'),
      s('Vægure og bordure'),
      s('Opbevaringskasser, kurve og kasser'),
      s('Sæsonpynt', 'Julepynt, påskepynt m.fl.')
    ]),
    group('Borddækning og køkken', 'package', [
      s('Tallerkener og skåle'),
      s('Kopper, krus og glas'),
      s('Bestik og serveringsbestik'),
      s('Fade, kander og tekander'),
      s('Køkkenredskaber og bageudstyr'),
      s('Gryder og pander'),
      s('Opbevaring af mad', 'Bøtter, glaskrukker')
    ]),
    group('Belysning', 'lamp', [
      s('Bordlamper'),
      s('Gulvlamper'),
      s('Loftslamper og pendler'),
      s('Lampeskærme og lyskæder')
    ])
  ] }),
  cat({ slug: 'underholdning', label: 'Underholdning', icon: 'game', intro: 'Spil, konsoller, bøger, vinyl og film – læst, spillet og klar til en ny.', groups: [
    group('Videospil og konsoller', 'game', [
      s('Konsoller', 'PlayStation, Xbox, Nintendo, retro'),
      s('Spil', 'PS5, PS4, Xbox Series, Switch, PC'),
      s('Tilbehør', 'Controllere, headsets, VR-udstyr, kabler, tasker')
    ]),
    group('Brætspil og puslespil', 'grid', [
      s('Strategispil'),
      s('Familiespil og selskabsspil'),
      s('Rollespil og figurspil', 'Warhammer, D&D'),
      s('Puslespil', 'Voksne og børn')
    ]),
    group('Bøger', 'book', [
      s('Skønlitteratur og krimier'),
      s('Faglitteratur og biografier'),
      s('Tegneserier, manga og graphic novels'),
      s('Kogebøger og livsstilsbøger'),
      s('Børne- og ungdomsbøger')
    ]),
    group('Musik og film', 'music', [
      s('Vinylplader', 'LP’er og singler'),
      s('CD’er og kassetter'),
      s('DVD’er, Blu-ray og 4K Ultra HD')
    ])
  ] }),
  cat({ slug: 'kaeledyr', label: 'Kæledyr', icon: 'paw', intro: 'Senge, legetøj, seler og transportkasser til hund, kat og smådyr.', groups: [
    group('Hunde', 'paw', [
      s('Hundetøj og dækkener'),
      s('Halsbånd, seler og liner'),
      s('Hundesenge, puder og tæpper'),
      s('Hundelegetøj'),
      s('Skåle og foderstationer'),
      s('Transportkasser og sikkerhedsseler til bil'),
      s('Pelspleje og børster')
    ]),
    group('Katte', 'paw', [
      s('Kradsetræer og kradsebrætter'),
      s('Kattesenge og huler'),
      s('Kattelegetøj'),
      s('Kattebakker og tilbehør'),
      s('Madskåle og vandfontæner'),
      s('Transportkasser')
    ]),
    group('Smådyr, fugle og fisk', 'pin', [
      s('Bure, inventar og løbehjul til gnavere'),
      s('Fuglebure og legetøj'),
      s('Akvarieudstyr og dekorationer')
    ])
  ] })
] as const;

/** Sektionen, en underkategori hører til (fx "Sneakers" under Kvinder → "Sko") */
export function groupOf(slug: string, sub: string): CategoryGroup | undefined {
  return CATEGORIES.find((c) => c.slug === slug)?.groups.find((g) => g.items.includes(sub));
}

/** Eksempler for en underkategori ("Trenchcoats, dunjakker …") */
export const examplesOf = (slug: string, sub: string): string | undefined => groupOf(slug, sub)?.examples[sub];

/** Små bogstaver uden accenter og tegnsætning – til at matche søgeord mod eksempler */
const fold = (s: string) => s.toLocaleLowerCase('da-DK').normalize('NFKD').replace(/[\u0300-\u0309\u030b-\u036f]/g, '').normalize('NFC');

/**
 * Underkategorier, hvis eksempler eller sektion indeholder ordet ("trenchcoat" → "Frakker og jakker",
 * "chelsea" → "Støvler"). Søgningen finder så også annoncer, hvor ordet ikke står i titlen.
 */
export function subsMatching(word: string): string[] {
  const w = fold(word.trim());
  if (w.length < 3) return [];
  const out = new Set<string>();
  for (const c of CATEGORIES) for (const g of c.groups) for (const s of g.items) {
    if (fold(`${g.label} ${g.examples[s] ?? ''}`).includes(w)) out.add(s);
  }
  return [...out];
}

/** Børnestørrelser efter alder (fra 0–3 mdr. til 14+ år) */
export const KIDS_SIZES = [
  '0-3 mdr.', '3-6 mdr.', '6-9 mdr.', '9-12 mdr.', '12-18 mdr.', '18-24 mdr.',
  '2-3 år', '3-4 år', '4-5 år', '5-6 år', '6-7 år', '7-8 år', '8-9 år', '9-10 år', '10-11 år', '11-12 år', '12-13 år', '13-14 år', '14+ år'
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
