# apps/site – re:spin hjemmeside (testversion på GitHub Pages)

Markedspladsens hjemmeside med fokus på brugernes varer, som hos Vinted, og en ren, professionel opbygning i stil med store danske webshops. Siden bygges som **statisk eksport** (ren HTML/CSS/JS) og udgives på GitHub Pages: <https://imnotcap.github.io/re-spin/>

**Stak:** Next.js 16 (App Router, `output: 'export'`), TypeScript, Tailwind CSS v4 og `@respin/ui` (kit og Tailwind-tema), Motion og React Bits. Gebyrer beregnes med `@respin/core`, med samme regler som checkout.

```bash
npm run dev:site                                       # http://localhost:3030
NEXT_PUBLIC_BASE_PATH=/re-spin npm run build -w site   # → apps/site/out (som på GitHub Pages)
```

## Sider

| Sti | Indhold |
|---|---|
| `/` | Kompakt banner, tryghedslinje, kategorier, *Nyt fra medlemmerne*, populære mærker, *Mest populære*, *Fra certificerede sælgere* og en opfordring til at sælge. Ingen vare går igen på siden. |
| `/kategori/[slug]/` | 8 kategorier. Underkategorier som chips, filtre (størrelse, stand, pris, mærke) og sortering. Filtrene står i URL'en, så et link kan deles og overlever genindlæsning. |
| `/vare/[id]/` | Galleri og gennemskuelig pris (pris, pris inkl. køberbeskyttelse og udfoldelig opdeling). "Køb nu" viser præcis, hvad købet koster. Desuden detaljer, beskrivelse, sælgerkort, *Flere fra sælgeren* og *Lignende varer*. På mobil er der en fast købsbjælke. |
| `/medlem/[id]/` | Sælgerprofil: vurdering, certificering, by, svartid og varer til salg |
| `/soeg/?q=` | Søgning i titel, mærke, kategori, farve og stand. Accenter og tegnsætning ignoreres ("levis" finder Levi's). Har samme filtre som kategorierne. |
| `/favoritter/` | Varer gemt med hjertet. De gemmes kun i browseren, så der kræves intet login. |
| `/saelg/`, `/saadan-virker-det/`, `/gebyrer/`, `/sikkerhed/` | Sælg-guide, sådan virker det (trin, nøgletal, FAQ), gebyrberegner og køberbeskyttelse |
| `/licenser/` | Licenser for tredjeparts-software og skrift |

Varerne og sælgerne er eksempeldata (`lib/catalog.ts`): 38 varer og 8 sælgere. Når backend'en er klar, erstattes kataloget af rigtige data. Kort, filtre og sider er uændrede.

## Ydelse og lazy load

- **Alt er forudrenderet HTML** (65 sider). Overskrifter, varer og priser står i HTML'en, så siden virker uden JavaScript.
- **Filtre og søgning:**
  - Server-HTML'en og første klientvisning er identiske, så intet hopper (CLS 0).
  - Filterændringer skriver til URL'en med `history.replaceState`. Der hentes intet fra nettet.
- **Favoritter** læses med `useSyncExternalStore` fra localStorage. Det er sikret mod blokeret lager og ugyldige data og synkroniseres mellem faner.
- **React Bits-animationer** (`LazyBits.tsx`) hentes først, når browseren er ledig eller elementet er tæt på. Indtil da vises den endelige tekst.
- **Motion** indlæses med `LazyMotion`.
- **Skrift:** Inter via `next/font/local`. Den er forhåndsindlæst, og en størrelsestilpasset reserveskrift sikrer, at intet flytter sig.
- **Kategorier og stand** ligger i `lib/categories.ts`, så header og filtre ikke trækker hele kataloget med i browseren.
- **Bevægelse og print:** *Reducer bevægelse* slår alle animationer fra. Ved print vises alt, og købsbjælken skjules.

Målt med Lighthouse (mobil) på statisk eksport bag en GitHub Pages-lignende server:

| Side | Ydelse | Tilgængelighed | Best practices | LCP | CLS |
|---|---|---|---|---|---|
| `/` | 100 | 100 | 100 | 0,9 s | 0 |
| `/kategori/sko/` | 100 | 100 | 100 | 0,9 s | 0 |
| `/vare/…` | 100 | 100 | 100 | 0,9 s | 0 |
| `/soeg/` | 99 | 100 | 100 | 0,9 s | 0 |
| `/medlem/…`, `/favoritter/`, `/saelg/`, `/saadan-virker-det/` | 100 | 100 | 100 | 0,9 s | 0 |

SEO er bevidst 60: testversionen har `noindex` og `robots.txt: Disallow: /`. Ved rigtig lancering sættes `SITE.isTest = false` i `lib/site.ts`, og `public/robots.txt` opdateres.

## Testet

Enhedstests (vitest, en del af `npm test`):

- `lib/catalog.test.ts`: katalogets integritet, sortering og søgning (æ/ø/å, accenter, tegnsætning).
- `lib/browse.test.ts`: filtre, prisintervaller uden huller, og at URL'en kan skrives og læses tilbage. Ondsindede værdier ignoreres.

I browseren (Chromium) mod den statiske eksport:

- **Alle 62 sider:** status 200, præcis én h1, titel og ingen konsolfejl.
  - Ingen vandret scroll på 320, 390, 768 og 1280 px.
  - Alle 128 interne links virker og har base-stien.
- **Søgning, filtre, sortering og URL'en.** Filtrene overlever genindlæsning, og ugyldige værdier ignoreres.
- **Vareside:**
  - Køb-arket regner rigtigt (fx 450 + 25,50 + 49 = 524,50 kr.). Arket er fast i vinduet, låser scroll bagved, lukker med Escape og giver fokus tilbage.
  - Galleriet virker, og købsbjælken på mobil dækker ikke footeren.
- **Favoritter:** gem, tæller i header, favoritside, genindlæsning, fjern og ødelagte data.
- **Mobilmenu**, gebyrberegner, siden uden JavaScript, reduceret bevægelse og 404.
- **axe-core: 0 overtrædelser** på 13 sidetyper på mobil og desktop. Det gælder også åben menu, åbne filtre, udfoldet prisopdeling, toast og køb-arket.
- **0 layout-skift**, også med `?q=`, filtre i URL'en og gemte favoritter.

## GitHub Pages: begrænsninger at kende

- **Ingen egne HTTP-headers.** Pages kan ikke sætte CSP, HSTS-preload osv. Det er acceptabelt for en statisk side uden login og betaling. Den rigtige side (`apps/web`) sætter alle headers.
- **Kun statisk:** intet login og ingen database. "Køb nu" viser prisen, men kan ikke købe.
- **Cache:** Pages cacher i cirka 10 minutter.

## Licenser

`components/reactbits/` er under MIT + Commons Clause (se README der). Skriften Inter er under SIL Open Font License 1.1 (`app/fonts/OFL-Inter.txt`). Begge er listet på `/licenser/`.
