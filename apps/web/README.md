# apps/web – Videro hjemmeside og login

Markedspladsens hjemmeside med fokus på brugernes varer, som hos Vinted, og en ren, professionel opbygning i stil med store danske webshops. Testversionen ligger på GitHub Pages: <https://imnotcap.github.io/re-spin/>

**Stak:** Next.js 16 (App Router), TypeScript, Tailwind CSS v4 og `@respin/ui` (kit og Tailwind-tema), Motion og React Bits. Gebyrer beregnes med `@respin/core`, med samme regler som checkout. Login kommer fra `@respin/auth`, headers og CSP fra `@respin/security`.

## To måder at bygge den på

| | Server | Statisk (`STATIC_EXPORT=1`) |
|---|---|---|
| Kommando | `npm run build -w web` | `npm run build:static -w web` → `out/` |
| Til | Vercel/Node ([../../docs/platform/08-deploy.md](../../docs/platform/08-deploy.md)) | GitHub Pages |
| Login, konto, `/api/*` | ja | nej – filerne er slet ikke med |
| Sikkerheds-headers og nonce-CSP | ja (`proxy.server.ts`) | nej (Pages kan ikke sætte headers) |
| Konto-knap i headeren | ja | nej |

Filer, der hedder `*.server.tsx`/`*.server.ts`, er kun med i server-bygget (`pageExtensions` i `next.config.mjs`).

```bash
npm run dev:site                                                  # statisk tilstand, ingen miljøvariabler: http://localhost:3030
npm run dev:web                                                   # med login: kræver database og miljøvariabler, se .env.example
NEXT_PUBLIC_BASE_PATH=/re-spin npm run build:static -w web        # → apps/web/out (som på GitHub Pages)
```

## Login og sikkerhed (server-bygget)

| Sti | Indhold |
|---|---|
| `/log-ind/` | Adgangskode eller passkey, derefter to-trins-kode hvis slået til. `?next=` accepteres kun som intern sti. |
| `/opret-konto/`, `/bekraeft-email/` | Tilmelding. Kontoen bekræftes med link i en mail (engangstoken, kun hash gemmes). |
| `/glemt-adgangskode/`, `/ny-adgangskode/` | Nulstilling. Svarer det samme, uanset om e-mailen findes. En ny adgangskode logger alle enheder ud. |
| `/konto/` | Navn, aktive enheder (log ud enkeltvis eller alle andre), skift adgangskode, log ud |
| `/konto/sikkerhed/` | Passkeys og to-trins-login med gendannelseskoder. Kræver, at du lige har bekræftet din adgangskode. |
| `/api/me/` | Headerens login-status: kun visningsnavnet, `Cache-Control: no-store, private` |
| `/api/health/`, `/api/webhooks/stripe/` | Drift og Stripe |

- **Adgangskoder:** Argon2id, mindst 12 tegn, tjek mod lækkede adgangskoder (Have I Been Pwned med k-anonymitet).
- **Sessioner:** tilfældigt token i en `__Host-`-cookie (`HttpOnly`, `Secure`, `SameSite=Lax` i produktion). Kun hashen gemmes.
- **Beskyttelse:** rate limiting i Postgres pr. IP og pr. konto. Formularer er server actions med Next' Origin-tjek. Login-sider sender ingen referrer.
- **Mail** sendes via Resend. I produktion afvises konsol-mail, og `APP_URL` skal være https.
- **CSP:** scripts og styles kun med nonce (`strict-dynamic`), `frame-ancestors 'none'`. Målt på produktionsbuild: 0 CSP-brud på 17 sider, mobil og desktop.

Testet: enhedstests i `packages/auth`. I browseren (Chromium, rigtig Postgres-protokol): 23 login-trin og 19 passkey/to-trins-trin. axe-core: 0 overtrædelser på login-siderne.

## Annoncer (server-bygget)

| Sti | Indhold |
|---|---|
| `/saelg/ny/` | Sæt til salg: 1–8 billeder (forsidebillede kan vælges), kategori og type, mærke, størrelse, stand, pris med live udbetaling, pakkestørrelse |
| `/annonce/[id]/` | Annoncen. Ejeren ser "Redigér"; andre ser "Køb nu" (prisberegning – betaling kommer senere) |
| `/konto/annoncer/` | Mine annoncer: redigér, markér som solgt, sæt til salg igen, fjern |
| `/api/billeder/` | Upload af ét billede (kræver login og samme oprindelse) |
| `/api/annoncer/` | Offentligt feed (`?category=sko&q=nike&limit=12`), kort cache i CDN'et |

Forside, kategorier og søgning viser medlemmernes annoncer øverst ("Lige sat til salg"). I det statiske byg erstattes komponenten af en tom udgave via aliaset `@respin-live` (`next.config.mjs`).

- **Ejerskab:** alle ændringer sker med `WHERE seller_id = <den indloggede>`. En andens annonce giver samme svar som "findes ikke".
- **Billeder:** billedet tjekkes på magic bytes (aldrig filnavn eller Content-Type), og der er et pixelloft på 40 MP. Det omkodes til WebP, roteres efter EXIF og mister alle metadata. Der gælder højst 4 MB pr. billede (browseren gør det mindre først), højst 60 uploads i timen og højst 40 ubrugte billeder pr. bruger.
- **Annoncer:** en annonce kan kun bruge egne, færdigbehandlede billeder, som ikke er brugt før. Ellers rulles alt tilbage. Højst 20 nye annoncer i døgnet.
- **Gennemgang:** tekst om MobilePay, telefonnumre, e-mails eller links sender annoncen til gennemgang, før andre kan se den.

## Menu og sprog

- **Kategorier** (`lib/categories.ts`): 8 hovedkategorier med grupper og i alt 80 typer. Desktop har en megamenu med genveje (nyeste, populære, under 200 kr.), alle grupper som kolonner, et fotokort og populære mærker. Den åbner ved hover med en lille forsinkelse eller med pilen/↓ på tastaturet, og Escape lukker. På mobil vælger man en kategori i menuen (☰) og ser derefter dens grupper og typer. En type uden varer viser "ingen varer" i stedet for alle varer.
- **Sprog** (`lib/i18n/`): dansk, engelsk, svensk, norsk og tysk vælges i topbjælken eller mobilmenuen. Valget huskes i browseren, og `<html lang>` følger med. Serveren viser altid dansk, og de andre sprog hentes først, når de vælges, som en lille fil pr. sprog. Brugernes egne tekster (titler, beskrivelser) oversættes ikke. Lange informationssider og konto-sider er endnu kun på dansk. En test sikrer, at alle sprog har de samme nøgler og pladsholdere.

## Offentlige sider

| Sti | Indhold |
|---|---|
| `/` | Fotobanner med kort, tryghedslinje, kategorier med fotos, *Nyt fra medlemmerne*, split-banner til at sælge, *Mest populære*, populære mærker og *Fra certificerede sælgere*. Ingen vare går igen på siden. |
| `/kategori/[slug]/` | 8 kategorier. Underkategorier som chips, filtre (størrelse, stand, pris, mærke) og sortering. Filtrene står i URL'en, så et link kan deles og overlever genindlæsning. |
| `/vare/[id]/` | Galleri og gennemskuelig pris (pris, pris inkl. køberbeskyttelse og udfoldelig opdeling). "Køb nu" viser præcis, hvad købet koster. Desuden detaljer, beskrivelse, sælgerkort, *Flere fra sælgeren* og *Lignende varer*. På mobil er der en fast købsbjælke. |
| `/medlem/[id]/` | Sælgerprofil: vurdering, certificering, by, svartid og varer til salg |
| `/soeg/?q=` | Søgning i titel, mærke, kategori, farve og stand. Accenter og tegnsætning ignoreres ("levis" finder Levi's). Har samme filtre som kategorierne. |
| `/favoritter/` | Varer gemt med hjertet. De gemmes kun i browseren, så der kræves intet login. |
| `/saelg/`, `/saadan-virker-det/`, `/gebyrer/`, `/sikkerhed/` | Sælg-guide, sådan virker det (trin, nøgletal, FAQ), gebyrberegner og køberbeskyttelse |
| `/licenser/` | Licenser for tredjeparts-software og skrift |

Varerne og sælgerne er eksempeldata (`lib/catalog.ts`): 43 varer og 8 sælgere i seks kategorier (Kvinder, Mænd, Børn, Hjem, Underholdning, Kæledyr – se `lib/categories.ts`). Fotos er fra Unsplash (Unsplash-licensen) og ligger på siden selv i `public/img` (WebP, 480/960 px, i alt ca. 2,9 MB), så ingen tredjepart får besøgendes IP-adresse. Når backend'en er klar, erstattes kataloget af rigtige data. Kort, filtre og sider er uændrede.

## Ydelse og lazy load

- **Alt er forudrenderet HTML** (65 sider). Overskrifter, varer og priser står i HTML'en, så siden virker uden JavaScript.
- **Filtre og søgning:**
  - Server-HTML'en og første klientvisning er identiske, så intet hopper (CLS 0).
  - Filterændringer skriver til URL'en med `history.replaceState`. Der hentes intet fra nettet.
- **Favoritter** læses med `useSyncExternalStore` fra localStorage. Det er sikret mod blokeret lager og ugyldige data og synkroniseres mellem faner.
- **React Bits** (`RotatingText` i banneret) hentes først, når browseren er ledig. Indtil da vises det første ord.
- **Fotos** har `srcset`/`sizes`, så mobilen henter den lille version. Bannerfotoet hentes med høj prioritet, resten lazy.
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

- **Ingen egne HTTP-headers.** Pages kan ikke sætte CSP, HSTS-preload osv. Det er acceptabelt for en statisk side uden login og betaling. Server-bygget af samme app sætter alle headers.
- **Kun statisk:** intet login og ingen database. "Køb nu" viser prisen, men kan ikke købe. Login kræver server-bygget.
- **Cache:** Pages cacher i cirka 10 minutter.

## Licenser

`components/reactbits/` er under MIT + Commons Clause (se README der). Skriften Inter er under SIL Open Font License 1.1 (`app/fonts/OFL-Inter.txt`). Begge er listet på `/licenser/`.
