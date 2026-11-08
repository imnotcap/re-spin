import type { IconName } from '@respin/ui';

export const STEPS = {
  seller: [
    { icon: 'camera', title: 'Tag billeder', text: 'Op til 8 billeder. Vi fjerner selv metadata som GPS-position, før billederne vises.' },
    { icon: 'tag', title: 'Sæt en pris', text: 'Det er gratis at oprette annoncer, og du får hele prisen – 0 % i kommission.' },
    { icon: 'package', title: 'Send og få pengene', text: 'Når varen er solgt, får du en fragtlabel. Pengene udbetales, når køber har modtaget varen.' }
  ],
  buyer: [
    { icon: 'search', title: 'Find dit fund', text: 'Søg og filtrér efter kategori, størrelse, stand og pris.' },
    { icon: 'chat', title: 'Spørg eller byd', text: 'Skriv med sælger og giv et bud direkte i appen – så er du dækket.' },
    { icon: 'shield', title: 'Køb trygt', text: 'Vi holder pengene, til du har modtaget varen. Er den ikke som beskrevet, får du pengene tilbage.' }
  ]
} as const satisfies Record<string, ReadonlyArray<{ icon: IconName; title: string; text: string }>>;

export const FAQ: ReadonlyArray<{ q: string; a: string }> = [
  { q: 'Hvad koster det at sælge?', a: 'Ingenting. Det er gratis at oprette annoncer, og vi tager 0 % i kommission – du får hele salgsprisen. Køberen betaler for køberbeskyttelse og fragt. Vil du have mere opmærksomhed, kan du fremhæve annoncen mod betaling.' },
  { q: 'Hvad betaler køber?', a: 'Varens pris, fragt og køberbeskyttelse på 5 % + 3 kr. Køberbeskyttelsen dækker, hvis varen ikke kommer frem eller ikke er som beskrevet.' },
  { q: 'Hvornår får jeg mine penge som sælger?', a: 'Når køber har godkendt varen – eller automatisk 48 timer efter levering, hvis køber ikke melder et problem.' },
  { q: 'Hvorfor skal jeg ikke betale med MobilePay direkte til sælger?', a: 'Betaler du uden om appen, er du ikke dækket af køberbeskyttelsen. Det er den mest almindelige form for svindel på markedspladser.' },
  { q: 'Hvad er en passkey?', a: 'En passkey er en login-nøgle, der ligger på din telefon eller computer. Du logger ind med Face ID, fingeraftryk eller PIN – der er ingen adgangskode, der kan stjæles eller phishes.' },
  { q: 'Er Videro åben endnu?', a: 'Nej. Det her er en testversion af hjemmesiden. Appen er under udvikling.' }
];
