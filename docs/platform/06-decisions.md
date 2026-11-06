# 06 · Arkitekturbeslutninger (ADR)

Format: **Beslutning · Hvorfor · Alternativer · Konsekvenser · Status.** Skriv en ny ADR, når en beslutning er svær at fortryde.

## ADR-001 · TypeScript og Next.js som modulær monolit
**Beslutning:** Ét TypeScript-monorepo med Next.js (App Router) til web og admin, domænet i interne pakker, én PostgreSQL.
**Hvorfor:** Delte typer, eksisterende UI-kit (React), SEO på annoncesider, få bevægelige dele for et lille team.
**Alternativer:** Rails (Vinteds valg; produktivt, men mister kit og delte typer), mikroservices (for tidligt), separat API-service (kan udskilles senere).
**Konsekvenser:** Nonce-CSP kræver dynamisk rendering (ingen statisk caching af HTML – håndteres med CDN/ISR på ikke-nonce-sider senere). Next.js-specifikke sårbarheder skal følges (Dependabot).
**Status:** Besluttet · implementeret.

## ADR-002 · Stripe Connect med "separate charges and transfers" og outbox
**Beslutning:** Opkræv køber på platformen, hold pengene (bogført som passiver), overfør til sælger efter godkendelse. Eksterne kald via outbox med idempotensnøgler.
**Hvorfor:** Undgår at bygge betalingsinfrastruktur og KYC selv; giver kontrol over tidspunktet for udbetaling.
**Alternativer:** Direct/destination charges (mindre kontrol over tilbageholdelse), Mangopay/Adyen for Platforms (markedsplads-specifikke), egen licens (tung).
**Konsekvenser:** Juridisk afklaring nødvendig (se [03](03-payments.md#åbne-spørgsmål)); MobilePay + Connect uafklaret; disputes og clawback skal bygges.
**Status:** Besluttet i princippet · kerne implementeret og testet · **afventer afklaring af pengemodel**.

## ADR-003 · Auth
**Beslutning (forslag):** Egen auth i vores database med **passkeys som primær login**, adgangskode som fallback, MFA og step-up. Anbefalet bibliotek: **Better Auth** (TypeScript, sessioner i egen DB, Drizzle-adapter, passkey/2FA-udvidelser). *Verificér bibliotekets aktuelle status og funktioner før valg (Auth.js er i bevægelse).*
**Hvorfor:** Sessioner og brugere i samme database gør "log alle ud" og spærring enkle; ingen leverandør-lock-in på identiteter.
**Alternativer:** Managed (Clerk, WorkOS: hurtigere og færre sikkerhedsfejl at begå, men løbende pris og lock-in), Auth.js.
**Konsekvenser:** Vi ejer sikkerheden for login. Kræver rate limiting, lækket-adgangskode-tjek, gendannelsesflow og ekstern gennemgang.
**Status:** Åben – **kræver din beslutning** ([04](04-roadmap.md#beslutninger-der-kræver-dig)).

## ADR-004 · Admin som separat app på eget subdomæne bag Cloudflare Access
**Beslutning:** `apps/admin` på `admin.respin.dk`; Cloudflare Access (SSO+MFA) foran; IP-allowlist som ekstra lag; appen verificerer Access-JWT og rolle **selv**, i proxy **og** i hver side.
**Hvorfor:** Tidlig afvisning, uafhængige cookies/CSP, mindre angrebsflade, og beskyttelse selv hvis proxy/middleware omgås (bevist i test).
**Alternativer:** Host-baseret routing i én app (delte cookies og kode, større risiko), VPN (kan kombineres), egen login for staff (flere egne sikkerhedsfejl).
**Konsekvenser:** Cloudflare er en afhængighed; origin skal låses til Cloudflare (ellers kan IP-header forfalskes).
**Status:** Besluttet · implementeret.

## ADR-005 · Penge som heltal i øre og dobbelt bogholderi
**Beslutning:** Alle beløb er `integer` øre (branded type `Ore`). Hver pengebevægelse er en balanceret ledger-transaktion; historik er append-only.
**Hvorfor:** Ingen floating point-fejl; revisionsspor; fejl opdages (balance ≠ 0) i stedet for at gemme sig.
**Alternativer:** `numeric` i kr. (risiko for afrundingsfejl), enkelt saldo-felt (intet spor).
**Konsekvenser:** Rettelser sker med modposteringer; kræver afstemning mod Stripe.
**Status:** Besluttet · implementeret og testet.

## ADR-006 · Integritet i databasen, ikke kun i koden
**Beslutning:** Constraints og triggers håndhæver: ét aktivt køb pr. annonce, balanceret ledger, append-only historik, frosne ordrebeløb, afsluttede ordrer kan ikke genåbnes; databaseroller begrænser hver app.
**Hvorfor:** Fejl, race conditions og angreb i applikationskoden kan ikke bryde de vigtigste regler.
**Alternativer:** Kun applikationslogik (billigere at ændre, men skrøbeligt).
**Konsekvenser:** Skemaændringer skal reviewes grundigt; triggers testes (PGlite) og mutationstestes.
**Status:** Besluttet · implementeret og testet.

## ADR-007 · Postgres-baseret kø (outbox) før Redis/BullMQ
**Beslutning:** `outbox`-tabellen + en worker, der poller. Skift til en dedikeret kø, når volumen/scheduling kræver det.
**Hvorfor:** Transaktionel konsistens ("ordre ændres" og "job oprettes" er atomisk) og færre driftsdele.
**Alternativer:** BullMQ/Redis, Inngest, Trigger.dev, SQS.
**Konsekvenser:** Polling-latency (sekunder); `runOutbox` skal have en planlagt kørsel og alarm på `failed`.
**Status:** Besluttet · funktion implementeret, worker ikke skrevet.
