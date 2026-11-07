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
| [07-tools-and-costs.md](07-tools-and-costs.md) | **Værktøjer, priser og månedlige omkostninger pr. fase**, økonomi pr. ordre, opgraderingsplan når I vokser |
| [08-deploy.md](08-deploy.md) | **Sæt login i drift:** Vercel, Neon, Resend, miljøvariabler, migrationer og tjek efter deploy |

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
| CSP med nonce, sikkerheds-headers | ✅ | `packages/security`, `apps/web/proxy.server.ts` | tests + målt på produktionsbuild + browser-gennemgang af 17 sider (inkl. login-siderne) på mobil og desktop: 0 CSP-brud |
| IP-allowlist (v4/v6, spoof-sikker), RBAC, fire-øjne, rate limiter, redirect/origin/upload-validering | ✅ | `packages/security` | tests |
| Cloudflare Access-JWT-verifikation (alg=none, nøgleforveksling, forkert audience …) | ✅ | `packages/security` | tests med egne nøgler 🟡 ikke mod Cloudflares rigtige nøgler |
| Admin-adgangskæde (host → IP → identitet → rolle), dobbeltforsvar | ✅ | `apps/admin` | HTTP-tests mod produktionsbuild, inkl. bypass-forsøg og fjernet proxy |
| Checkout, ordre-overgange, Stripe-webhook, outbox | ✅ | `packages/payments` | integrationstests (Postgres + ægte webhook-signaturer) 🟡 ikke mod Stripes API |
| **Login** – tilmelding, e-mailbekræftelse, login/log ud, sessioner, glemt adgangskode, skift adgangskode, step-up, aktive enheder | ✅ | `packages/auth`, `apps/web` | 28 tests + mutationstest + 23-trins browser-e2e; sider i hjemmesidens design, axe 0 fejl |
| Mail via Resend (header-injektion afvist, timeout, ingen nøgle i fejl) | ✅ | `packages/auth` (`ResendMailer`) | 5 tests 🟡 ikke sendt mod Resends rigtige API |
| Migrationer med ét klik + hosting-opsætning | 🟡 | `.github/workflows/db-migrate.yml`, `apps/web/vercel.json` | kørt mod tom Postgres (idempotent) 🟡 ikke kørt mod Neon/Vercel – se [08-deploy.md](08-deploy.md) |
| Delt rate limiting i Postgres | ✅ | `packages/auth` (`PgRateLimiter`) | tests 🟡 række-låsen kan ikke bevises i PGlite (én forbindelse) |
| **Passkeys** (login uden adgangskode) og **to-trins-login** (authenticator-app + gendannelseskoder) | ✅ | `packages/auth`, `apps/web/app/konto/sikkerhed` | 30 tests med software-autentikator + 10/10 mutationer fanget + 19-trins browser-e2e med Chromiums virtuelle autentikator (dev og produktion) |
| **Hjemmeside** – forside med varer og kategorier, kategorier med filtre, varesider med gennemskuelig pris, sælgerprofiler, søgning, favoritter. Statisk testversion på GitHub Pages; samme app med login på en server | ✅ | `apps/web`, `.github/workflows/pages.yml` | enhedstests + browser-tests af alle sider + axe 0 fejl + Lighthouse 99–100, CLS 0, udgivet på Pages 🟡 eksempeldata |
| **Annoncer** – sæt til salg med billeder, redigér, markér som solgt, fjern; vises på forside, i kategorier og søgning; automatisk gennemgang ved betaling uden om platformen | ✅ | `apps/web/lib/listings.ts`, `apps/web/app/saelg/ny`, `annonce`, `konto/annoncer` | 13 tests (IDOR, rollback, moderation, søgning) + 34-trins browser-e2e + axe 0 og 0 CSP-brud på produktionsbuild |
| **Billed-upload** – magic bytes, pixelloft, omkodning til WebP (EXIF/GPS fjernes), separat domæne (Vercel Blob) | ✅ | `apps/web/lib/image-pipeline.ts`, `image-store.ts`, `/api/billeder/` | 9 tests (SVG/GIF/HTML-polyglot, dekompressionsbombe, EXIF) + e2e (CSRF 403, 401, 413) 🟡 ingen virusscanning ud over omkodningen |
| Chat, bud, rigtige favoritter i databasen, sælgerprofiler med anmeldelser | ⬜ | – | se roadmap |
| Rigtige admin-funktioner (moderation, refunderinger, brugere) | ⬜ | `apps/admin` | siderne findes og er rolle-beskyttede, men tomme |
| Worker-proces der kører `runOutbox` | ⬜ | – | funktionen er klar og testet |
| CI (typecheck, tests, build, audit, CodeQL, secret-scan) | ✅ | `.github/workflows` | hele sekvensen kørt i ren kopi 🟡 workflows ikke kørt på GitHub endnu |

## Kør det lokalt

```bash
npm install
npm test                 # alle tests (kræver ingen database – bruger PGlite)
npm run typecheck
npm run db:dev           # lokal Postgres (PGlite) på port 5433 med alle migrationer – ingen Docker
APP_URL=http://localhost:3000 DATABASE_URL=postgres://postgres@127.0.0.1:5433/postgres DB_POOL_MAX=1 PWNED_CHECK=off MFA_ENCRYPTION_KEY=$(openssl rand -base64 32) npm run dev:web
# → http://localhost:3000/opret-konto/ (bekræftelseslinket skrives i serverloggen)
ADMIN_DEV_EMAIL=dig@respin.dk ADMIN_DEV_ROLE=admin npm run dev:admin   # http://localhost:3001 (dev-login kun uden for produktion)
npm run dev:site         # hjemmesiden uden login på http://localhost:3030 (ingen miljøvariabler – som på GitHub Pages)
```

## Sæt det i drift

Se [08-deploy.md](08-deploy.md).

## Det jeg ikke ved, og som du skal tage stilling til

Se [04-roadmap.md → Beslutninger](04-roadmap.md#beslutninger-der-kræver-dig). Kort: virksomhedsform/CVR og Stripe-konto, domænenavn,
mailudbyder, MitID-leverandør, hosting og budget, teamstørrelse, og hvordan I vil stille jer til at holde kunders penge (Stripe Connect vs. egen licens).
