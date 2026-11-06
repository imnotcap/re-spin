# apps/site – re:spin hjemmeside (testversion på GitHub Pages)

Offentlig præsentationsside: forside med live-demo, gebyrberegner og side om tryghed. Bygges som **statisk eksport** (ren HTML/CSS/JS) og udgives på GitHub Pages: <https://imnotcap.github.io/re-spin/>

**Stak:** Next.js 16 (App Router, `output: 'export'`) · TypeScript · Tailwind CSS v4 + `@respin/ui` (kit og Tailwind-preset) · Motion · React Bits · `@respin/core` (samme gebyrregler som appen).

```bash
npm run dev:site                                   # http://localhost:3030
NEXT_PUBLIC_BASE_PATH=/re-spin npm run build -w site   # → apps/site/out (som på GitHub Pages)
```

## Sider

| Sti | Indhold |
|---|---|
| `/` | Hero, nøgletal, "sådan virker det" (faner), funktioner, live-demo af appen, gebyrer, FAQ |
| `/gebyrer/` | Gebyrberegner – samme kode (`@respin/core/fees`) som checkout bruger |
| `/sikkerhed/` | Køberbeskyttelse, svindel-tips, hvordan data opbevares |
| `/404.html` | Egen "siden findes ikke" (GitHub Pages viser den automatisk) |

## Ydelse og lazy load

- **Alt er forudrenderet HTML.** Overskrifter og tekst står i HTML'en, så siden virker uden JavaScript, og det største element tegnes med det samme.
- **Live-demoen** (`DemoSection`) hentes først, når man er 400 px fra den (`LazyMount` + `next/dynamic`, `ssr: false`). Indtil da står en pladsholder i samme højde, så intet hopper.
- **React Bits-animationer** (`LazyBits.tsx`) hentes først, når browseren er ledig eller elementet er tæt på skærmen. Fallback er den endelige tekst. Det skiftende ord i hero står sidst på sin linje, så skiftet ikke flytter anden tekst.
- **Motion** indlæses med `LazyMotion` (`m.*`-komponenter); animationsfunktionerne hentes i en separat chunk.
- **Skrift:** Inter (latin-delsæt, variabel) via `next/font/local`. Den er selv-hostet og forhåndsindlæst, med en størrelsestilpasset reserveskrift, så skiftet ikke flytter noget.
- **Fremkomst-animation** (`Reveal.tsx`) er ren CSS. Indhold, der allerede er synligt ved indlæsning, skjules aldrig.
- **Bevægelse og print:** *Reducer bevægelse* slår alle animationer fra. Ved print vises alt.
- **Bundle:** `@respin/core` importeres via under-stier (`/fees`, `/money`, `/limits`), så zod ikke kommer med.

Målt (Lighthouse, mobil, statisk eksport bag en GitHub Pages-lignende server):

| Side | Ydelse | Tilgængelighed | Best practices | SEO | LCP | CLS |
|---|---|---|---|---|---|---|
| `/` | 100 | 100 | 100 | 60* | 0,8 s | 0 |
| `/gebyrer/` | 100 | 100 | 100 | 60* | 0,8 s | 0 |
| `/sikkerhed/` | 100 | 100 | 100 | 60* | 0,8 s | 0 |

\* SEO er bevidst lav: testversionen har `noindex` og `robots.txt: Disallow: /`, så den ikke dukker op i søgemaskiner. Når siden går i luften rigtigt, sættes `SITE.isTest = false` i `lib/site.ts`, og `public/robots.txt` opdateres.

## Testet

Ud over Lighthouse er følgende kørt i Chromium mod den statiske eksport bag en server, der efterligner GitHub Pages (base-sti, 301 til afsluttende `/`, `404.html` med status 404):

- **36 funktionelle tjek.** Dækker:
  - alle sider og links (ingen døde links, ingen konsolfejl) og ingen vandret scroll fra 320 px og op;
  - mobilmenu (Escape, fokus) og faner;
  - lazy demo med filtre, favoritter og vare-ark med korrekt beregning;
  - gebyrberegneren: grænser, ugyldigt input, certificeret sælger og fragtstørrelser;
  - siden uden JavaScript, og med reduceret bevægelse.
- **axe-core: 0 overtrædelser.** Gælder alle sider på mobil og desktop, inkl. det åbne demo-ark (fokus flyttes ind i dialogen).
- **0 layout-skift**, målt over 14 sekunder med flere ordskift på 1280, 390 og 320 px.
- **Print:** sektioner og animeret tekst, man ikke har scrollet hen til, kommer med på papir.

## GitHub Pages: begrænsninger at kende

- **Ingen egne HTTP-headers.** Pages kan ikke sætte CSP, HSTS-preload, `X-Frame-Options` osv. Det er acceptabelt for en statisk testside uden login og formularer. Den rigtige side (`apps/web`) sætter alle headers via `proxy.ts`.
- **Kun statisk:** ingen login, ingen database. Demoen kører udelukkende i browseren.
- **Cache:** Pages cacher i ca. 10 minutter, så en ny udgivelse kan være lidt om at slå igennem.

## Licenser

`components/reactbits/` er MIT + Commons Clause (se README der). Skriften Inter er SIL Open Font License 1.1 (`app/fonts/OFL-Inter.txt`).
