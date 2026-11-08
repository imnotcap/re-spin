# @respin/ui

Videro UI-kit til **React + TypeScript**, bygget til **Next.js (App Router)**. Samme design som det klikbare skelet i `../../app`, men som typede komponenter, tokens og forretningsregler.

- 40+ komponenter (knapper, formularer, produktkort, navigation, bundark, toasts, chat …)
- Design tokens som CSS-variabler (`--rs-*`) **og** som TypeScript (`@respin/ui/tokens`)
- Alle CSS-klasser har prefix `rs-`, så kittet ikke støder ind i din egen CSS
- Tailwind-tema til både v3 (preset) og v4 (`@theme`)
- Ingen runtime-afhængigheder udover `react`/`react-dom`
- `next/link`-integration via én provider (klient-navigation uden at kittet afhænger af Next)

## Installation (monorepo)

Repoet er et npm workspace, så `@respin/ui` kan bruges af enhver app i `apps/`:

```json
{ "dependencies": { "@respin/ui": "*", "next": "^16", "react": "^19", "react-dom": "^19" } }
```

```bash
npm install          # i repoets rod
npm run build:ui     # bygger packages/ui → dist/ (JS, typer og CSS)
npm run dev          # bygger kittet og starter showcase-appen
```

Uden for monorepoet: byg pakken og installér den som tarball (`npm pack`) eller udgiv den til jeres registry.

## Opsætning i Next.js

**1. Importér CSS i `app/layout.tsx`** (rækkefølgen er ligegyldig, `styles.css` er det eneste påkrævede):

```tsx
import '@respin/ui/fonts.css';  // valgfri: Satoshi fra Fontshare (ellers Inter/system)
import '@respin/ui/reset.css';  // valgfri: body-reset – udelad hvis din app har en
import '@respin/ui/styles.css'; // påkrævet: tokens + komponenter
```

**2. Tilføj providers** (client component, én gang i roden):

```tsx
// app/providers.tsx
'use client';
import Link from 'next/link';
import { RespinProvider, ToastProvider } from '@respin/ui';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <RespinProvider linkComponent={Link}>
      <ToastProvider>{children}</ToastProvider>
    </RespinProvider>
  );
}
```

**3. Brug komponenterne** – også direkte i server components:

```tsx
// app/page.tsx (server component)
import { AppShell, Screen, TopBar, ScreenContent, ProductGrid, ProductCard, TabBar } from '@respin/ui';

export default function Home() {
  return (
    <AppShell>
      <Screen>
        <TopBar title="Hjem" />
        <ScreenContent withTabBar>
          <ProductGrid>
            <ProductCard product={{ id: 1, title: 'Ganni uldjakke', brand: 'Ganni', size: 'M', price: 450 }} href="/item/1" badge="Næsten ny" />
          </ProductGrid>
        </ScreenContent>
        <TabBar activeId="home" />
      </Screen>
    </AppShell>
  );
}
```

> Komponenter med event handlers (`onClick`, `onChange` …) kan kun få dem fra en **client component**. Kittet selv er markeret `"use client"`, så du kan bruge det overalt, men du kan ikke sende funktioner ind fra en server component.

## Indgange

| Import | Indhold | Bruges i |
|---|---|---|
| `@respin/ui` | Komponenter (`"use client"`) | server **og** client components |
| `@respin/ui/utils` | `formatKr`, `buyerFee`, `sellerFee`, `RESPIN_TABS`, `ICON_NAMES`, `cx` | server **og** client |
| `@respin/ui/tokens` | `colors`, `gradients`, `shadows`, `typeScale`, `spacing`, `radius`, `fontSizes` | server **og** client |
| `@respin/ui/tailwind-preset` | `respinPreset` (Tailwind v3) | `tailwind.config.ts` |
| `@respin/ui/tailwind.css` | `@theme` + gradient-utilities (Tailwind v4) | din `globals.css` |

Værdier (ikke komponenter) ligger bevidst uden for hovedindgangen: en værdi eksporteret fra en `"use client"`-modul kan ikke bruges i en server component.

## Komponenter

| Område | Komponenter |
|---|---|
| Grundlag | `Text`, `Icon` (57 ikoner, typet `IconName`), `LogoMark`, `Wordmark`, `RespinProvider` |
| Handlinger | `Button` (`primary` · `buy` · `forest` · `dark` · `outline` · `ghost`), `IconButton`, `Chip`, `FavoriteButton` |
| Visning | `Badge`, `CertifiedBadge`, `Avatar`, `Rating`, `Notice`, `Progress`, `Stepper`, `Timeline`, `PriceSummary`, `EmptyState`, `Skeleton` |
| Formularer | `Field`, `Select` (`emptyOption` til filtre, fx "Alle"), `Textarea`, `Toggle`, `Checkbox`, `OptionCard`, `Tabs` (`segmented` / `underline`) |
| Lister | `List`, `ListRow`, `ConversationRow`, `Tile`, `TileGrid`, `Stat` |
| Produkt | `ProductCard` (foto med `imageSrcSet`, sælger, stand, antal favoritter, pladsholder-ikon, pris inkl. køberbeskyttelse), `ProductGrid` (`app` / `responsive`), `ProductRow`, `ProductImage`, `Price`, `HScroll`, `CategoryTile` (`icon` / `card` / `photo`), `SectionHeader`, `Hero`, `BalanceCard` |
| Markedsplads (hjemmeside) | `Breadcrumbs`, `DetailList`, `SellerCard`, `PriceDetails` (gennemskuelig pris med udfoldelig opdeling, virker uden JS), `TrustBar` (`cards` / `compact`), `ProductGallery`, `StepList` (nummererede trin), `Accordion` (spørgsmål og svar), `Dropdown` (knap + liste i temaets stil, fuld tastaturstyring) |
| Flad stil | `<body class="rs-flat">`: ensfarvede knapper, tynde kanter, små radier – til hjemmesider. Appen beholder gradienterne. |
| Navigation | `AppShell`, `Screen`, `ScreenContent`, `ScreenFooter`, `Section`, `TopBar`, `SearchBar`, `TabBar` |
| Overlays | `BottomSheet` (fokus-fælde, Escape, animation; `placement="viewport"` på hjemmesider), `ToastProvider` + `useToast()` |
| Chat | `ChatThread`, `ChatBubble`, `ChatDay`, `OfferCard`, `Composer` |

Se dem alle live i showcase-appen (`apps/showcase`, rute `/`) og et eksempel på en lille app på `/demo`.

### Links og `next/link`

Alt med `href` (`Button`, `IconButton`, `Chip`, `ListRow`, `ProductCard`, `TabBar` …) renderes via den link-komponent, du giver `RespinProvider`. Uden provider bruges et almindeligt `<a>`.

### Billeder

`ProductImage`/`ProductCard` viser en **neutral grå flade**, når der ikke er et billede. Giv `product.imageUrl`, eller send din egen billedkomponent via `image`, fx `next/image`:

```tsx
<ProductCard product={p} href="/item/1" image={<Image src={p.imageUrl!} alt={p.title} fill sizes="50vw" />} />
```

### Tabbar

```tsx
import { RESPIN_TABS } from '@respin/ui/utils';
const tabs = RESPIN_TABS.items.map((t) => (t.id === 'messages' ? { ...t, badge: unread } : t));
<TabBar items={tabs} activeId={activeId} />   // activeId udledes fx af usePathname() i en client component
```

## Forretningsregler (`@respin/ui/utils`)

| Regel | Funktion |
|---|---|
| Køberbeskyttelse 5 % + 3 kr. | `buyerFee(price)`, `buyerTotal(price, shipping)` |
| Gebyr til Videro: 0 % (ingen kommission) | `sellerFee(price, certified)`, `sellerPayout(price, certified)` |
| Formatering | `formatKr(450)` → `450 kr.` · `formatKr(475.5)` → `475,50 kr.` (øre kun når der er nogen; hårdt mellemrum før "kr.") |

Gebyrerne regnes i hele øre med samme afrunding som `@respin/core` (kilde til sandhed). En test sammenligner kittet med core for alle priser fra 1 til 100.000 kr.

## Tailwind

Kittet har et Tailwind-tema, så du kan bygge nye skærme med de samme tokens. Samme klassenavne i v3 og v4.

**Tailwind v4** (CSS-first, anbefalet) – i din `globals.css`:

```css
@import "tailwindcss";
@import "@respin/ui/styles.css" layer(components);  /* kit-CSS i components-laget, så utilities altid vinder */
@import "@respin/ui/tailwind.css";                  /* @theme: farver, typografi, radier, skygger, gradienter */
```

**Tailwind v3** – preset i `tailwind.config.ts` (og `import '@respin/ui/styles.css'` i layout):

```ts
import type { Config } from 'tailwindcss';
import { respinPreset } from '@respin/ui/tailwind-preset';

export default { presets: [respinPreset], content: ['./app/**/*.{ts,tsx}'] } satisfies Config;
```

Klasser (begge versioner):

| Hvad | Klasser |
|---|---|
| Brandfarver | `bg-forest` `bg-forest-700` `bg-forest-900` `bg-lime` `bg-lime-600` `bg-coral` `bg-coral-600` `bg-cream` `bg-slate` … samt `stone-50…400`, `cream-200/300`, `slate-300/500/700` |
| Semantiske farver (følger temaet) | `bg-canvas` `bg-surface` `bg-sunken` `text-ink` `text-muted` `border-line` `text-brand` `bg-action` `bg-buy` `text-danger` |
| Typografi | `text-display` `text-h1` `text-h2` `text-h3` `text-body` `text-small` `text-caption` (inkl. line-height, vægt og letter-spacing) |
| Radier | `rounded-sm` (6) `rounded-md` (10) `rounded-lg` (14) `rounded-xl` (20) `rounded-pill` |
| Skygger | `shadow-line` `shadow-raised` `shadow-float` |
| Gradienter | `bg-grad-ink` `bg-grad-lime` `bg-grad-forest` `bg-grad-deep` `bg-grad-accent` `bg-grad-card` `bg-grad-stone` `bg-grad-energy` |
| Mål | `p-gutter` (16px) · `h-tap` / `min-h-tap` (44px) · `pb-tabbar` |
| Motion | `ease-respin` `ease-spring` (v3 også `duration-fast/base/slow`) |

Gode at vide:

- `rounded-sm/md/lg/xl` **overskriver** Tailwinds standard med Videros radier (6/10/14/20 px).
- Brand-farver kan bruge opacity-modifikatorer (`bg-forest/50`). I v3 er de hex-værdier, i v4 følger de CSS-variablerne.
- Du behøver ikke `reset.css` sammen med Tailwind (preflight klarer det).
- I v4 giver `layer(components)`, at `className="rounded-pill"` på en kit-`Button` vinder over komponentens egen radius. Uden lag-importen vil kit-CSS'en (ulagret) slå Tailwind-klasser.
- Tailwind v4-filen `tailwind.css` genereres ved build ud fra `tokens.ts`, så alle tre steder (CSS, TypeScript, Tailwind) holdes ens.

## Tokens og tilpasning

Alle farver, afstande, radier, skygger og motion er CSS-variabler på `:root` (og `.rs-theme`), fx `var(--rs-forest)`, `var(--rs-grad-ink)`, `var(--rs-r-md)`. Overskriv dem for at tilpasse, fx `--rs-font-brand` for en anden skrift.

Design-reglerne fra skelettet gælder: lime = primær handling, grafit = valgt/køb, coral kun til hjerte og notifikation, neutrale grå til flader og pladsholdere.

## Udvikling

```bash
npm run build -w @respin/ui      # JS (ESM+CJS), .d.ts og CSS → dist/
npm run typecheck -w @respin/ui  # strict TypeScript
```

`src/styles/*.css` er kilden til CSS (samlet til `dist/styles.css` af `scripts/build-css.mjs`).
