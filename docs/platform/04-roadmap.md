# 04 · Roadmap

Størrelser er **relative** (S/M/L/XL), ikke tidsløfter. Hver fase har en **sikkerhedsport**: faser afsluttes ikke, før porten er bestået.

## Fase 0 · Fundament ✅ (denne gren)

Designsystem og UI-kit, domæne (penge/ordre/ledger), database med integritetsregler og roller, sikkerhedsbibliotek, betalingslag, admin-adgangskæde, CI. Se [README](README.md#status-hvad-er-bygget).

## Fase 1 · Kernemarked (L–XL)

**Leverancer**
- Auth: ✅ e-mail + adgangskode, bekræftelse, sessioner, gendannelse, step-up, aktive enheder · ⬜ passkeys, MFA, mailudbyder, besked ved ny enhed (se ADR-003). *(L)*
- Profiler, sælgerprofil, følg sælgere, favoritter.
- Annoncer: opret/redigér/slet, **upload-pipeline** (omkodning, pixelloft, scanning, separat CDN-domæne), moderation (automatisk + kø).
- Feed, kategorier, søgning og filtre (Postgres), gemte søgninger.
- Chat og bud (realtid), notifikationer (e-mail + web push), `assessMessageRisk` i UI (advarsler).
- Forbrugersite: rigtige sider fra `app/`-skelettet i `apps/web`, SEO (annonceside, sitemap, strukturerede data).
- Admin: brugere, annoncer, moderationskø, audit-visning.

**Sikkerhedsport S1:** IDOR-tests for alle endpoints · delt rate limiter · upload-pipeline pen-testet · auth-gennemgang · Cloudflare-opsætning (WAF, Access) · backups med øvet gendannelse.

## Fase 2 · Betaling og tillid (XL)

**Leverancer**
- Connect-onboarding for sælgere (hostet), `account.updated`-webhook, KYC-status i UI.
- Checkout-UI med Stripe Elements (3-D Secure), MobilePay efter afklaring.
- Forsendelse via aggregator (fx Shipmondo) eller direkte med PostNord/DAO/GLS: labels, pakkeshop-valg, **tracking → `carrier_delivered`**.
- **Worker:** kører `runOutbox`, betalingsudløb, afsendelsesfrist, auto-godkendelse (timers).
- Disputes (`charge.dispute.*`), refunderinger, clawback, tvist-flow, anmeldelser.
- Daglig **afstemning** (ledger ↔ Stripe) med alarm.
- Certificeret sælger (kriterier + MitID via formidler), admin-flow til certificering.
- Udbetalingsgrænser/-pauser for nye sælgere; Stripe Radar-regler.
- Admin: refunderinger og tvistafgørelser med **fire-øjne**, kill switches.

**Sikkerhedsport S2 (før rigtige penge):** ekstern penetrationstest (betaling, admin, kontoovertagelse) · ledger-afstemning kører og alarmerer · alle punkter i [go-live-checklisten](02-security.md#11-go-live-checkliste-alle-skal-være-afkrydset) · jurist har godkendt pengemodel og vilkår.

## Fase 3 · Drift og vækst (L)

Observabilitet og alarmer, on-call, performance (Core Web Vitals), caching/ISR, anbefalinger, AI-baggrundsfjerner i produktion, DAC7-rapportering, kundeservice-værktøjer, privatlivsvenlig analyse.

**Port S3:** DAST (ZAP) i CI mod staging · katastrofeøvelse (gendannelse, nøglerotation) · gennemgang af logning for PII.

## Fase 4 · Native apps (L–XL)

React Native/Expo, genbrug af `@respin/core`-typer og tokens. Passkeys, push, deep links, offline-tålmodighed. Appens API-adgang bruger tokens (ikke cookies) → CSRF-modellen ændres.

**Port S4:** mobil-specifik gennemgang (certifikat-pinning-overvejelse, sikker lagring, jailbreak-hensyn), app-store-krav.

## Fase 5 · Skalering (efter målinger)

Dedikeret søgemaskine, læse-replika, partitionering af store tabeller, udskilning af chat/søgning, SLO'er med fejlbudget.

## Tværgående spor (løbende)

| Spor | Indhold |
|---|---|
| Juridisk | Vilkår, privatlivspolitik, DSA/DAC7/GDPR, betalingsregulering, forbrugerlovgivning for C2C |
| Tillid og sikkerhed | Moderationspolitik, svindelmønstre, anmeldelses-integritet, kundeservice |
| Kvalitet | Tests ved hver ny funktion (inkl. misbrugstilfælde), mutationstjek af kritiske kontroller |
| Dokumentation | Opdatér disse dokumenter og trusselsmodellen ved hver ny funktion |

## Risikoregister (top)

| Risiko | Sandsynlighed | Konsekvens | Håndtering |
|---|---|---|---|
| Pengemodellen (holde købers penge) er ikke tilladt som tænkt | Mellem | Meget høj | Afklar med Stripe + jurist **før** fase 2; alternativ: Mangopay/Adyen for Platforms |
| Svindel/chargebacks æder marginen | Høj | Høj | Radar, udbetalingspauser, tracking-krav, daglig afstemning |
| Kontoovertagelse | Høj | Høj | Passkeys/MFA, step-up, notifikationer |
| Kold-start (ingen sælgere/købere) | Høj | Høj | Produkt/marketing – uden for teknisk plan; start med snæver niche eller by |
| Fejl i bogholderi | Lav | Meget høj | DB-invarianter, afstemning, tests (er på plads i fundamentet) |
| Afhængighed af få personer | Mellem | Høj | Dokumentation (denne mappe), tests, CODEOWNERS |
| Forsyningskæde-angreb | Mellem | Høj | Lockfile, `--ignore-scripts`, audit, SHA-pinning, review af nye pakker |
| Regulatorisk (DSA/DAC7/GDPR) | Mellem | Mellem–høj | Juridisk gennemgang i fase 1–2 |

## Beslutninger, der kræver dig

| # | Beslutning | Min anbefaling | Blokerer |
|---|---|---|---|
| 1 | Virksomhedsform/CVR og ansvarlig for persondata | Opret selskab (fx ApS) før rigtige penge/brugere | Stripe-konto, vilkår |
| 2 | Stripe-konto + godkendelse til Connect-markedsplads | Ansøg tidligt – godkendelse kan tage tid | Fase 2 |
| 3 | Pengemodel (separate charges and transfers) kontra alternativer | Afklar med Stripe + jurist nu | Fase 2 |
| 4 | Domænenavn (`respin.dk`?) og separat CDN-domæne | Registrér begge; slå registrar-lås og 2FA til | Subdomæner, Access |
| 5 | Mailudbyder (transaktionel, EU, DKIM) | Vælg en med EU-datacenter og databehandleraftale | Login i produktion |
| 6 | MitID-formidler (til certificering/KYC) | Udvælg efter pris/dækning; ikke nødvendigt før certificering | Certificering |
| 7 | Hosting og budget (Vercel + managed Postgres i EU?) | Start enkelt; hold data i EU | Fase 1 |
| 8 | Teamstørrelse og on-call | Mindst to personer med adgang til alt kritisk | Drift |
| 9 | Sælger-gebyrer (1 % / 0,5 %) og køberbeskyttelse (5 % + 3 kr.) endelige? | Efter økonomi-regnestykke med Stripe-priser | Checkout |
| 10 | Certificeringskriterier | Mine eksempler (10 salg, 4,5 i vurdering, MitID) er forslag | Certificering |
