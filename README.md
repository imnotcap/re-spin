# re:spin – design-skelet (mobil marketplace)

Et klikbart skelet til en mobil marketplace-app (à la Vinted) med en fælles designpakke. Ren HTML/CSS/JS – **ingen build, ingen installation**. Åbn filerne direkte i en browser.

| Åbn | Hvad |
|---|---|
| `overview.html` | Alle 27 skærme på ét lærred (flow-kort) |
| `app/index.html` | Den klikbare prototype (på mobil fylder den hele skærmen, på desktop vises den i en telefonramme) |
| `design-system/index.html` | Komponentbiblioteket (farver, typografi, ikoner, komponenter) |

## Designpakken (`design-system/`)

```
tokens.css      farver, typografi, afstande, radier, skygger, motion  ← eneste sted at ændre udseende
base.css        reset + typografi- og layout-hjælpeklasser
components.css  alle komponenter (kun tokens, ingen hårde værdier)
icons.js        50+ ikoner + logo   UI.icon('heart', 24)
components.js   HTML-byggere        UI.btn(), UI.productCard(), UI.field() …
```

Regel: **en skærm må kun bruge `UI.*`-komponenter og token-variabler.** Skal noget nyt bruges to steder, bliver det en komponent.

Komponenter: Button (primary/buy/outline/dark/forest/ghost, sm/md/lg) · IconButton · Chip · Badge · Avatar · Rating · TopBar · SearchBar · TabBar (flydende, med Sælg-knap) · ProductCard/Grid/Row · Category · SectionHead · Field/Select/Textarea/Toggle/Checkbox/OptionCard · Segmented · Tabs · ListRow/List · Conversation · Bubble/Offer · BottomSheet · Toast · Notice · Progress/Stepper · Timeline · PriceSummary · EmptyState · Skeleton.

## Skærme (`app/`)

`screens.js` indeholder alle skærme, `data.js` mock-data, `app.js` router/overgange/sheets.

- **Onboarding:** velkommen, log ind, opret konto, intro (5 trin), interesser
- **Opdag:** hjem, søg (med forslag), resultater (filter + sortering), kategori, favoritter
- **Vare:** vareside (galleri, sælger, Køb nu / Byd, sikkerhed, lignende), sælgerprofil, bud-sheet, del/rapportér
- **Sælg:** opret annonce (billeder, AI-baggrundsfjerner, live-fremdrift og udbetalingsberegning), annonce live
- **Beskeder:** indbakke, chat (hurtige svar, bud-status), notifikationer
- **Køb:** betaling (adresse, fragt, betaling, live-total), ordre bekræftet, mine ordrer, ordredetaljer m. tidslinje
- **Mig:** profil, rediger profil, saldo/udbetaling, indstillinger, hjælp/FAQ

## UI-kit til Next.js / TypeScript

`packages/ui` er **`@respin/ui`**: samme design som skelettet, men som typede React-komponenter, tokens og forretningsregler (gebyrer, formatering). `apps/showcase` er en Next.js-app, der viser alle komponenter (`/`) og en lille app-demo (`/demo`).

```bash
npm install
npm run dev        # bygger kittet og starter showcase på http://localhost:3000
```

Se `packages/ui/README.md` for opsætning, komponentliste og regler.

## UX-principper bag skelettet

Se `docs/ux-principper.md`.

## Næste skridt

Rigtige fotos (pladsholdere er `UI.ph`), Satoshi-fonten er hentet fra Fontshare (falder tilbage til systemfont offline), mørk tilstand (tokens er klar til det), rigtig backend/state, og at flytte komponenterne til jeres rigtige stack (React Native/Flutter) – tokens kan mappes 1:1.
