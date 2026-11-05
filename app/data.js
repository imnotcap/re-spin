/* re:spin — mock-data (kun til skelettet) */
window.DATA = {
  me: { id: 0, name: 'Casper J.', handle: '@casper', city: 'Aarhus C', rating: 4.8, reviews: 23, followers: 128, following: 54, balance: 1240, bio: 'Sælger mit vintage-tøj og et par sneakers. Sender inden for 2 dage' },
  categories: [
    { id: 'vintage', label: 'Vintage', icon: 'shirt' }, { id: 'gadestil', label: 'Gade-stil', icon: 'hoodie' },
    { id: 'sneakers', label: 'Sneakers', icon: 'sneaker' }, { id: 'tasker', label: 'Tasker', icon: 'bag' },
    { id: 'bolig', label: 'Bolig', icon: 'home2' }, { id: 'born', label: 'Børn', icon: 'baby' },
    { id: 'sport', label: 'Sport', icon: 'ball' }, { id: 'smykker', label: 'Smykker', icon: 'gem' }
  ],
  sellers: {
    1: { id: 1, name: 'Mette K.', city: 'København V', rating: 4.9, reviews: 120, followers: 342, since: '2023', replies: 'Svarer inden for en time' },
    2: { id: 2, name: 'Jonas P.', city: 'Odense C', rating: 4.7, reviews: 56, followers: 88, since: '2024', replies: 'Svarer samme dag' },
    3: { id: 3, name: 'Sofie L.', city: 'Aarhus N', rating: 5.0, reviews: 31, followers: 140, since: '2024', replies: 'Svarer inden for en time' },
    4: { id: 4, name: 'Anders B.', city: 'Aalborg', rating: 4.6, reviews: 12, followers: 19, since: '2025', replies: 'Svarer inden for en dag' }
  },
  items: [
    { id: 1, title: 'Vintage ruskindstaske', brand: 'Vintage', size: 'One size', price: 320, cat: 'tasker', cond: 'God men brugt', seller: 1, tone: 'brown', glyph: 'bag', tags: ['vintage', 'ruskind', 'taske'], color: 'Brun', ship: '39 kr. med DAO', desc: 'Smuk 70’er-taske i blødt ruskind. Lidt patina på remmen, ellers i rigtig fin stand. Plads til A4 og laptop.' },
    { id: 2, title: 'Ganni uldjakke', brand: 'Ganni', size: 'M', price: 450, cat: 'vintage', cond: 'Næsten ny', seller: 3, tone: 'forest', glyph: 'shirt', tags: ['ganni', 'uld', 'jakke'], color: 'Grøn', ship: '39 kr. med DAO', desc: 'Brugt to gange. Tyk uldblanding, perfekt til efteråret. Str. M, store i størrelsen.', badge: ['Næsten ny'] },
    { id: 3, title: 'Adidas Samba OG', brand: 'Adidas', size: '41', price: 350, cat: 'sneakers', cond: 'God men brugt', seller: 2, tone: 'stone', glyph: 'sneaker', tags: ['adidas', 'samba', 'sneakers'], color: 'Hvid/sort', ship: '45 kr. med PostNord', desc: 'Klassiske Samba i hvid/sort. Brugt en sæson, rengjort og klar til nye eventyr.', badge: ['God men brugt'] },
    { id: 4, title: 'Levi’s 501 denim', brand: 'Levi’s', size: 'W30 L32', price: 280, cat: 'vintage', cond: 'God men brugt', seller: 4, tone: 'sky', glyph: 'shirt', tags: ['levis', '501', 'denim'], color: 'Blå', ship: '39 kr. med DAO', desc: 'Vintage 501 med den helt rigtige vask. Små slidmærker ved lommerne.' },
    { id: 5, title: 'Carhartt WIP hættetrøje', brand: 'Carhartt', size: 'L', price: 390, cat: 'gadestil', cond: 'Næsten ny', seller: 2, tone: 'sand', glyph: 'hoodie', tags: ['carhartt', 'hoodie'], color: 'Sand', ship: '39 kr. med DAO', desc: 'Tung hoodie i sand. Brugt få gange.', badge: ['Næsten ny'] },
    { id: 6, title: 'Nike Air Max 90', brand: 'Nike', size: '43', price: 520, cat: 'sneakers', cond: 'Som ny', seller: 4, tone: 'blush', glyph: 'sneaker', tags: ['nike', 'airmax'], color: 'Rød/hvid', ship: '45 kr. med PostNord', desc: 'Kun brugt indendørs. Original æske medfølger.', badge: ['Som ny'] },
    { id: 7, title: 'Kvindeligt skjorte-set i silke', brand: 'Samsøe', size: 'S', price: 210, cat: 'vintage', cond: 'Næsten ny', seller: 1, tone: 'forest', glyph: 'shirt', tags: ['silke', 'skjorte'], color: 'Lime', ship: '39 kr. med DAO', desc: 'Silkeskjorte og bukser i matchende sæt.' },
    { id: 8, title: 'Skindtaske med lynlås', brand: 'Mulberry', size: 'One size', price: 1200, cat: 'tasker', cond: 'God men brugt', seller: 3, tone: 'sand', glyph: 'bag', tags: ['skind', 'luksus'], color: 'Beige', ship: '49 kr. med DAO', desc: 'Klassisk model i fint skind. Sælges med støvpose.' },
    { id: 9, title: 'Retro løbejakke', brand: 'Adidas', size: 'M', price: 240, cat: 'sport', cond: 'God men brugt', seller: 4, tone: 'forest', glyph: 'hoodie', tags: ['retro', 'løb'], color: 'Grøn', ship: '39 kr. med DAO', desc: 'Let vindjakke fra 90’erne.' },
    { id: 10, title: 'Keramikvase, håndlavet', brand: 'Håndlavet', size: 'H 28 cm', price: 150, cat: 'bolig', cond: 'Som ny', seller: 3, tone: 'blush', glyph: 'home2', tags: ['keramik', 'vase'], color: 'Rosa', ship: '59 kr. med PostNord', desc: 'Unik vase fra lokal keramiker.' },
    { id: 11, title: 'Silkeørenringe i guld', brand: 'Pilgrim', size: 'One size', price: 90, cat: 'smykker', cond: 'Ny med mærke', seller: 1, tone: 'forest', glyph: 'gem', tags: ['guld', 'øreringe'], color: 'Guld', ship: '19 kr. brevpost', desc: 'Aldrig brugt, stadig i æske.' },
    { id: 12, title: 'Barnevogn-fodsæk', brand: 'Joolz', size: 'One size', price: 260, cat: 'born', cond: 'God men brugt', seller: 2, tone: 'sky', glyph: 'baby', tags: ['barn', 'fodsæk'], color: 'Grå', ship: '49 kr. med DAO', desc: 'Varm fodsæk, vasket og klar.' }
  ],
  trending: ['ganni', 'samba', 'vintage denim', 'carhartt', 'skindjakke', 'nike dunk'],
  recent: ['levis 501', 'ruskindstaske', 'adidas'],
  convos: [
    { id: 1, name: 'Mette K.', preview: 'Hej! Er den stadig til salg?', time: '9:41', unread: true, online: true, item: 'Vintage ruskindstaske', itemId: 1 },
    { id: 2, name: 'Sofie L.', preview: 'Tak for handlen – sender i morgen!', time: 'I går', unread: false, item: 'Ganni uldjakke', itemId: 2 },
    { id: 3, name: 'Jonas P.', preview: 'Du: Kan du gå ned til 300 kr.?', time: 'Tirs.', unread: true, item: 'Adidas Samba OG', itemId: 3 },
    { id: 4, name: 'Anders B.', preview: 'Perfekt, aftale!', time: '28. okt.', unread: false, item: 'Levi’s 501 denim', itemId: 4 }
  ],
  notifications: [
    { icon: 'heart', title: 'Mette K. kan lide din vare', sub: 'Carhartt WIP hættetrøje', time: '5 min.', unread: true },
    { icon: 'tag', title: 'Prisfald på en vare du følger', sub: 'Nike Air Max 90 er nu 520 kr.', time: '1 t.', unread: true },
    { icon: 'package', title: 'Din pakke er afsendt', sub: 'Ganni uldjakke – følg forsendelsen', time: 'I går', unread: false },
    { icon: 'star', title: 'Du har fået en ny anmeldelse', sub: 'Sofie L. gav dig 5 stjerner', time: '2 dage', unread: false }
  ],
  orders: {
    buy: [
      { id: 101, itemId: 2, status: 'Undervejs', tone: 'forest', date: '3. nov.', price: 450 },
      { id: 102, itemId: 4, status: 'Leveret', tone: 'soft', date: '28. okt.', price: 280 }
    ],
    sell: [
      { id: 201, itemId: 3, status: 'Skal sendes', tone: 'warn', date: '4. nov.', price: 350 },
      { id: 202, itemId: 5, status: 'Udbetalt', tone: 'soft', date: '20. okt.', price: 390 }
    ]
  },
  transactions: [
    { title: 'Salg: Carhartt WIP hættetrøje', date: '20. okt.', amt: 390 },
    { title: 'Udbetaling til bankkonto', date: '12. okt.', amt: -800 },
    { title: 'Salg: Nike Air Max 90', date: '9. okt.', amt: 520 },
    { title: 'Salg: Keramikvase', date: '2. okt.', amt: 150 }
  ],
  reviews: [
    { name: 'Sofie L.', stars: 5, text: 'Super hurtig forsendelse og lige som beskrevet. Kan klart anbefales!', time: '2 dage siden' },
    { name: 'Anders B.', stars: 5, text: 'Lækker handel, flot pakket', time: '1 uge siden' },
    { name: 'Jonas P.', stars: 4, text: 'God kommunikation. Varen var lidt mere brugt end forventet.', time: '3 uger siden' }
  ],
  faq: [
    ['Hvordan fungerer køberbeskyttelse?', 'Dine penge holdes sikkert, indtil du har modtaget og godkendt varen. Passer den ikke til beskrivelsen, kan du melde det inden for 2 dage.'],
    ['Hvad koster det at sælge?', 'Det er gratis at sælge på re:spin. Køber betaler et lille gebyr for køberbeskyttelse.'],
    ['Hvornår får jeg mine penge?', 'Saldoen frigives, når køber har godkendt varen – eller automatisk efter 2 dage. Udbetaling tager 1–2 bankdage.'],
    ['Hvordan sender jeg en pakke?', 'Du får en fragtetiket til print eller QR-kode til nærmeste pakkeshop, så snart varen er solgt.']
  ]
};
