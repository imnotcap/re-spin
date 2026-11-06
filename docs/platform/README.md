# re:spin platform – plan og skelet

Dette er planen for hele platformen (website, backend, betalinger, admin, drift) og status på det skelet, der er bygget.
Læs i rækkefølge, eller hop direkte til det, du skal bruge.

| Dokument | Indhold |
|---|---|
| [01-architecture.md](01-architecture.md) | Systemoverblik, subdomæner, teknologivalg (og alternativer), datamodel, flows |
| [02-security.md](02-security.md) | **Sikkerhed:** trusselsmodel, kontroller (hvor de er implementeret og testet), svindel, hemmeligheder, hændelser, go-live-checkliste |
| [03-payments.md](03-payments.md) | Pengeflow, Stripe Connect, bogholderi, fejlscenarier, åbne spørgsmål |
| [04-roadmap.md](04-roadmap.md) | Faser med leverancer, sikkerhedsporte og afslutningskriterier; risici; beslutninger der kræver dig |
| [05-infrastructure.md](05-infrastructure.md) | Miljøer, hosting, Cloudflare, DNS, database-drift, CI/CD |
| [06-decisions.md](06-decisions.md) | Arkitekturbeslutninger (ADR) med begrundelse |

## Status: hvad er bygget

Symboler: ✅ bygget og testet · 🟡 bygget, men ikke afprøvet i drift/mod rigtige tjenester · ⬜ planlagt

| Område | Status | Hvor | Bevis |
|---|---|---|---|
| Pengetyper, gebyrer (5 % + 3 kr. / 1 % / 0,5 %) | ✅ | `packages/core` | enhedstests |
| Ordre-tilstandsmaskine (hvem må hvad, hvornår) | ✅ | `packages/core` | tests inkl. udtømmende egenskabstests |
| Dobbelt bogholderi (balance-invarianter) | ✅ | `packages/core`, `packages/db` | tests + database-trigger |
| Input-validering, usynlige tegn, svindel-heuristik | ✅ | `packages/core` | tests |
| Databaseskema + integritetsregler (ingen dobbeltsalg, append-only, frosne beløb) | ✅ | `packages/db` | tests mod rigtig Postgres (PGlite), mutationstestet |
| Database-roller med mindste privilegium | ✅ | `packages/db/sql/roles.sql` | tests mod rigtig Postgres |
| CSP med nonce, sikkerheds-headers | ✅ | `packages/security`, `proxy.ts` | tests + målt på kørende server + browser uden CSP-brud |
| IP-allowlist (v4/v6, spoof-sikker), RBAC, fire-øjne, rate limiter, redirect/origin/upload-validering | ✅ | `packages/security` | tests |
| Cloudflare Access-JWT-verifikation (alg=none, nøgleforveksling, forkert audience …) | ✅ | `packages/security` | tests med egne nøgler 🟡 ikke mod Cloudflares rigtige nøgler |
| Admin-adgangskæde (host → IP → identitet → rolle), dobbeltforsvar | ✅ | `apps/admin` | HTTP-tests mod produktionsbuild, inkl. bypass-forsøg og fjernet proxy |
| Checkout, ordre-overgange, Stripe-webhook, outbox | ✅ | `packages/payments` | integrationstests (Postgres + ægte webhook-signaturer) 🟡 ikke mod Stripes API |
| Forbrugersite (`apps/web`) | 🟡 | `apps/web` | kun skelet: forside, health, webhook-endpoint |
| Login/konti (auth), annoncer, søgning, upload, chat, favoritter | ⬜ | – | se roadmap |
| Rigtige admin-funktioner (moderation, refunderinger, brugere) | ⬜ | `apps/admin` | siderne findes og er rolle-beskyttede, men tomme |
| Worker-proces der kører `runOutbox` | ⬜ | – | funktionen er klar og testet |
| CI (typecheck, tests, build, audit, CodeQL, secret-scan) | ✅ | `.github/workflows` | hele sekvensen kørt i ren kopi 🟡 workflows ikke kørt på GitHub endnu |

## Kør det lokalt

```bash
npm install
npm test                 # alle tests (kræver ingen database – bruger PGlite)
npm run typecheck
npm run dev:web          # http://localhost:3000
ADMIN_DEV_EMAIL=dig@respin.dk ADMIN_DEV_ROLE=admin npm run dev:admin   # http://localhost:3001 (dev-login kun uden for produktion)
```

## Det jeg ikke ved, og som du skal tage stilling til

Se [04-roadmap.md → Beslutninger](04-roadmap.md#beslutninger-der-kræver-dig). Kort: virksomhedsform/CVR og Stripe-konto, domænenavn,
valg af auth-løsning og MitID-leverandør, hosting og budget, teamstørrelse, og hvordan I vil stille jer til at holde kunders penge (Stripe Connect vs. egen licens).
