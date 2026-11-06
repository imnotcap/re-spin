# 02 · Sikkerhed

> Dette dokument beskriver trusselsmodel, kontroller og processer. Det er teknisk vejledning, ikke juridisk rådgivning.
> Juridiske punkter (GDPR, DSA, DAC7, bogføring, betalingsregulering) skal vurderes af en jurist/revisor før lancering.

Symboler: ✅ implementeret **og** testet · 🟡 implementeret, men ikke afprøvet i drift · ⬜ planlagt

## 1. Principper

1. **Forsvar i dybden.** Ingen kontrol står alene. Admin er fx beskyttet af Cloudflare Access, IP-allowlist, proxy-tjek **og** et uafhængigt tjek i hver side.
2. **Fejl lukket.** Manglende konfiguration, tom allowlist, ukendt rolle eller ugyldig token betyder *nej*, ikke "så lader vi den passere".
3. **Mindste privilegium.** Hver app, hver databaserolle og hver medarbejderrolle har kun det, den skal bruge.
4. **Stol aldrig på klienten.** Beløb, ejerskab, roller og filtyper bestemmes af serveren.
5. **Minimér data.** Vi gemmer ingen kort- eller bankdata (Stripe gør). Det, vi ikke har, kan ikke lække.
6. **Antag brud.** Uforanderlig audit-log, uforanderlig bogholderi, begrænsede databaserettigheder og backups, så skaden kan afgrænses og spores.
7. **Sikre standarder.** Det sikre er det nemme: biblioteker i `packages/security` bruges i stedet for ad hoc-kode.

## 2. Aktiver og aktører

**Det vi beskytter (i prioriteret rækkefølge):** (1) penge og bogholderi, (2) konti og login, (3) persondata (navne, adresser, beskeder), (4) tillid til annoncer og anmeldelser, (5) administrator-adgang, (6) tilgængelighed.

**Aktører:** anonym besøgende · køber · sælger · medarbejder · svindler (organiseret, automatiseret) · nysgerrig angriber · intern fejl · kompromitteret leverandør/afhængighed.

## 3. Trusselsmodel

| # | Trussel | Konsekvens | Kontrol | Hvor | Status |
|---|---|---|---|---|---|
| **Konti og identitet** | | | | | |
| T01 | Credential stuffing / brute force på login | Kontoovertagelse | Delt rate limit i Postgres pr. IP **og** pr. konto; Argon2id; tjek mod lækkede adgangskoder (HIBP k-anonymitet); min. 12 tegn. Mangler: passkeys, besked ved ny enhed | `auth` | ✅ · ⬜ passkeys |
| T02 | Kontoovertagelse (phishing, SIM-swap, sessionstyveri) | Tab af penge og data | `__Host-`-cookie (Secure, HttpOnly, SameSite=Lax, intet Domain); kun token-hash i DB; nyt token ved login; inaktiv (7 d) + absolut (30 d) udløb; log ud overalt; **step-up** (`reauthenticate`/`isElevated`). Mangler: passkeys + MFA | `auth`, `apps/web` | ✅ · ⬜ passkeys/MFA |
| T03 | Misbrug af kontogendannelse / **account pre-hijacking** | Overtagelse | Nulstillingslink: kun hash gemmes, 30 min., engangsbrug, ældre links ugyldige, alle sessioner tilbagekaldes, besked på mail. Aktivering kræver link **og** adgangskode (angriber der opretter kontoen først, får aldrig adgang). Mangler: udbetalingspause efter gendannelse | `auth` | ✅ |
| T04 | Brugerenumerering (login/reset-svar, ordre-id'er) | Kortlægning af brugere | Ens svar ved tilmelding, login og "glemt adgangskode"; dummy-hash ved ukendt e-mail; uuid'er. **Rest:** e-mail sendes synkront, så svartiden ved "glemt adgangskode" kan afsløre en konto → send via kø | `auth`, `payments/orders` | ✅ · 🟡 timing |
| T05 | Falske konti og bots | Spam, svindel | Turnstile, rate limits, e-mailbekræftelse | Cloudflare + auth | ⬜ |
| **Adgangskontrol** | | | | | |
| T06 | IDOR: læse/ændre andres ordrer, beskeder, annoncer | Datalæk, svindel | Ejerskab tjekkes **inde i** `applyOrderEvent`; samme svar for "findes ikke"/"ikke din". **Samme mønster skal bruges til beskeder og annoncer** | `payments/orders` | ✅ ordrer · ⬜ øvrige |
| T07 | Mass assignment (klient sender `certified`, `isAdmin`, pris) | Eskalering, gebyrunddragelse | `.strict()` zod-skemaer; kolonne-rettigheder i databasen: web-rollen **kan ikke** sætte `certified` | `core/validation`, `db/sql/roles.sql` | ✅ |
| T08 | Eskalering til medarbejder | Fuld kontrol | Rolle fra `staff_users` (ikke token); SSO+MFA; fire-øjne på gebyrer/staff/store refunderinger | `security/rbac`, `apps/admin` | ✅ |
| T09 | Admin eksponeret på internettet | Total kompromittering | Host-tjek (404) → IP-allowlist (403) → Access-JWT → rolle; `noindex`; `no-store` | `security/admin-guard`, `apps/admin/proxy.ts` | ✅ mod produktionsbuild |
| T10 | Middleware-omgåelse (klassen CVE-2025-29927) | Admin uden login | Samme vagt kører **igen** i hver side (`requireStaff`); ingen "x-staff"-header fra proxyen | `apps/admin/lib/auth.ts` | ✅ bevist ved at fjerne `proxy.ts` |
| **Input og injektion** | | | | | |
| T11 | SQL-injektion | Dataudtræk/-ændring | Parameteriserede queries (Drizzle); databaseroller begrænser skaden | `db` | ✅ |
| T12 | Stored XSS (annoncer, chat, profil) | Sessionstyveri | React escaper; tekst gemmes som ren tekst; `normalizeUserText` fjerner bidi/usynlige tegn; **nonce-CSP + strict-dynamic**; ingen `dangerouslySetInnerHTML` med brugerindhold | `core/validation`, `security/headers` | ✅ målt: alle scripts har svarets nonce, ingen CSP-brud i browser |
| T13 | CSRF | Handlinger i brugerens navn | SameSite-cookies; `isRequestOriginAllowed` på cookie-baserede route handlers (Server Actions har indbygget origin-tjek i Next) | `security/origin` | ✅ bibliotek · ⬜ anvendt |
| T14 | SSRF | Adgang til interne tjenester | Serveren henter aldrig URL'er fra brugere; billeder refereres med server-genererede uuid'er (`imageKeys`) | `core/validation` | ✅ |
| T15 | Åben redirect | Phishing | `safeRedirectPath` (afviser `//`, `\`, kodet CRLF/backslash, skemaer) | `security/redirect` | ✅ |
| T16 | Clickjacking | Utilsigtede klik | `frame-ancestors 'none'` + `X-Frame-Options: DENY` | `security/headers` | ✅ |
| T17 | Upload-angreb (SVG-XSS, polyglot, pixelbombe, GPS i EXIF, malware) | XSS, DoS, privatlivsbrud | Filtype ud fra **indhold**; kun jpeg/png/webp; størrelsesgrænse; server-genererede nøgler. **Skal tilføjes:** omkodning (fjerner metadata og ikke-billeddata), pixelloft, scanning, separat domæne med `nosniff` | `security/upload` | ✅ validering · ⬜ pipeline |
| T18 | Forretningslogik: prismanipulation, negative beløb, overløb, dobbeltsalg, dobbelt refundering | Tab af penge | Server beregner alt; `ore()` med grænser; DB-`CHECK`; delvist unikt indeks (ét aktivt køb pr. annonce); række-lås + optimistisk lås; idempotensnøgler | `core`, `db`, `payments` | ✅ inkl. samtidighedstests |
| T19 | Scraping og enumerering | Datatyveri, belastning | Rate limits, Cloudflare bot management, uuid'er | Cloudflare | ⬜ |
| **Betaling og svindel** | | | | | |
| T20 | Falske eller genafspillede webhooks | Gratis varer | Signatur på **rå body** + 5 min. tidsvindue + event-id som primærnøgle | `payments/webhook` | ✅ falsk, manipuleret og gammel signatur |
| T21 | For lille beløb / forkert valuta / andens PaymentIntent | Gratis varer | Beløb, valuta og PaymentIntent sammenlignes med ordren; mismatch → ordre bliver **ikke** betalt, audit-log, 500 (Stripe prøver igen) | `payments/webhook` | ✅ mutationstestet |
| T22 | Stjålne kort / card testing | Chargebacks | Stripe Radar + SCA/3-D Secure (PaymentIntents), rate limit på checkout | Stripe-konfiguration | ⬜ |
| T23 | "Varen kom aldrig" / chargebacks | Tab | Penge frigives først efter levering + godkendelse (eller 48 t); tracking; indsamling af beviser. **Mangler:** håndtering af `charge.dispute.*` | `core/order`, `payments` | ✅ flow · ⬜ disputes |
| T24 | Sælgersvindel (tom pakke, forfalskninger) | Tab, brand | Udbetaling efter godkendelse; udbetalingsgrænser/-pauser for nye sælgere; Connect-KYC; anmeld-flow | Roadmap fase 2 | ⬜ |
| T25 | Svindel uden for platformen (WhatsApp/MobilePay-links, falske betalingslinks) | Køber mister beskyttelse | `assessMessageRisk` flager betaling/kontakt uden for appen; advarsel til køber; links blokeret for nye konti | `core/risk` | ✅ heuristik · ⬜ UX |
| T26 | Hvidvask / muldyrkonti | Regulatorisk | Prisloft (100.000 kr.), Stripe KYC, hastighedsgrænser, DAC7-data, overvågning | `core/validation`, Stripe | 🟡 / ⬜ |
| T27 | Manipulation af bogholderi | Skjulte tab | Append-only-triggers; balancekrav ved commit; idempotensnøgler; **daglig afstemning mod Stripe** | `db`, `core/ledger` | ✅ DB · ⬜ afstemning |
| T28 | Betaling efter ordren er udløbet | Betalt uden vare | Automatisk refundering, intet bogføres | `payments/webhook` | ✅ |
| **Infrastruktur og forsyningskæde** | | | | | |
| T29 | Hemmeligheder i git/logs | Nøgler lækker | `.env*` ignoreret; gitleaks i CI; log-redaktion (`redactForLog`); env valideres ved opstart uden at udskrive værdier | `.gitignore`, `security/redact`, `security/env` | ✅ kode · 🟡 CI |
| T30 | Kompromitteret afhængighed | Bagdør | Lockfile; `npm ci --ignore-scripts`; `npm audit`; Dependabot; gennemgang af nye pakker; **pin GitHub Actions til SHA** | CI | 🟡 / ⬜ SHA-pin |
| T31 | Kompromitteret CI/CD | Bagdør i produktion | `permissions: contents: read`; ingen secrets til PR-builds; branch protection + CODEOWNERS | `.github` | 🟡 · ⬜ branch protection slås til på GitHub |
| T32 | Kompromitteret app → database | Datatyveri | Roller med mindste privilegium; web kan ikke læse audit-log, ikke slette brugere, ikke certificere; TLS; privat netværk | `db/sql/roles.sql` | ✅ roller · ⬜ netværk |
| T33 | DDoS / dyre endpoints | Nedetid | Cloudflare, rate limiting, caching | Cloudflare | ⬜ |
| T34 | Subdomæne-overtagelse / DNS-kapring | Phishing fra vores domæne | Ingen dinglende DNS-poster; registrar-lås; 2FA på registrar og Cloudflare; CAA; DNSSEC | DNS | ⬜ |
| T35 | E-mail-spoofing af vores domæne | Phishing af kunder | SPF + DKIM + DMARC (`p=reject`) | DNS | ⬜ |
| T36 | Intern trussel / medarbejderfejl | Misbrug, fejl | RBAC; fire-øjne; uforanderlig audit-log; hurtig fratrædelse (Access + `staff_users.active`) | `security/rbac`, `apps/admin` | ✅ |
| T37 | Databrud (GDPR) | Bøder, tillid | Dataminimering; kryptering; hændelsesplan (72 timer, se §9) | Proces | ⬜ |
| T38 | Tredjepartsscripts / skimming (Magecart) | Kortdata stjæles | Ingen tredjepartsscripts; streng CSP; Stripe Elements i iframe | `security/headers` | ✅ |
| T39 | Host-header-angreb / cache poisoning | Omdirigering | Host-allowlist (admin); forsigtig caching i Cloudflare | `security/admin-guard` | ✅ admin · ⬜ web |
| T40 | Tabte backups / ransomware | Datatab | PITR, kopi uden for primær konto, **øvede** gendannelser | Drift | ⬜ |

## 4. Identitet og adgang

### Forbrugere (✅ e-mail + adgangskode bygget · ⬜ passkeys/MFA)

- Bygget: tilmelding → bekræftelseslink (24 t) + adgangskode → login; Argon2id (m=19 MiB, t=2, p=1, opgraderes ved login); min. 12 / maks. 128 tegn uden tvungne specialtegn; afvisning af lækkede (HIBP, fail-open) og åbenlyst svage adgangskoder; glemt adgangskode (30 min., engangslink); skift adgangskode; aktive enheder; log ud overalt.
- Næste: **passkeys som primær login** og MFA (TOTP/passkey) for sælgere med udbetalinger.
- **Step-up (genbekræftelse)** før: ændring af e-mail, udbetalingskonto, adgangskode, sletning af konto, og første udbetaling efter gendannelse.
- **Sessioner:** HttpOnly, Secure, SameSite=Lax, host-only (intet `Domain=`), rotation ved login/rettighedsændring, serverside-tilbagekaldelse, "log ud overalt".
- **Notifikation** (e-mail/push) ved ny enhed, ændret e-mail, ny udbetalingskonto.

### Medarbejdere (bygget i skelettet)

```
Internet → Cloudflare Access (SSO + MFA + evt. IP/enhed)
         → Cloudflare WAF (IP-regel som ekstra lag)
         → admin-app proxy.ts: host → IP → Access-JWT (RS256, audience, issuer, udløb)
         → hver side: requireStaff(permission): samme tjek igen + aktiv medarbejder i DB + rettighed
         → handling → audit-log (append-only)
```

- Afviste svar er ens og minimale (404 for forkert host, 403 ellers), `no-store`, `noindex`.
- **Fratrædelse:** fjern i identitetsudbyderen **og** sæt `staff_users.active = false` → adgang forsvinder med det samme.
- **Fire-øjne:** gebyrændringer, staff-administration og refunderinger/tvistafgørelser fra 1.000 kr. kræver en anden godkender (`needsSecondApproval`/`canApprove`). Håndhævelsen i workflowet bygges sammen med admin-funktionerne.

## 5. Data

| Klasse | Eksempler | Regler |
|---|---|---|
| Offentlig | Annoncer, visningsnavn, vurderinger | Moderation; ingen skjulte metadata i billeder |
| Intern | Ordrer, ledger, audit-log | Kun roller med behov; append-only |
| Personlig | E-mail, adresse, beskeder, IP | Dataminimering; logning uden PII (`redactForLog`, `maskEmail`); sletning/eksport på anmodning |
| Følsom | Udbetalingsoplysninger, KYC | **Gemmes hos Stripe, ikke hos os** |
| Hemmeligheder | API-nøgler, DB-URL, webhook-secret | Secret manager; aldrig i git/logs; roteres; pr. miljø |

- **Kryptering:** TLS 1.2+ overalt, HSTS (preload), kryptering i hvile hos udbyder. Felt-kryptering tilføjes, hvis vi får følsomme felter.
- **GDPR:** dataregister, databehandleraftaler (Stripe, hosting, e-mail), eksport/sletning (regnskabsdata skal typisk gemmes i 5 år – bekræft med revisor), konsekvensanalyse (DPIA) for chat og svindeldetektion.
- **DSA/DAC7:** anmeld-og-fjern-proces, sporbarhed for erhvervssælgere, indberetning af sælgeres indtægter til Skat. Omfang afhænger af virksomhedens størrelse – få en juridisk vurdering.

## 6. Applikationssikkerhed (tjekliste ved hver ny funktion)

- [ ] Input valideres med et `.strict()` zod-skema; tekst normaliseres (`normalizeUserText`).
- [ ] **Autorisation tjekkes ved dataadgang**, ikke kun i proxy/UI. Ejerskab verificeres mod databasen; fremmed = "findes ikke".
- [ ] Beløb og priser beregnes på serveren; klienten sender kun id'er.
- [ ] Ændrende endpoints med cookies bruger `isRequestOriginAllowed` (eller Server Actions).
- [ ] Nye ændringer af ordrer går gennem `applyOrderEvent`; nye pengebevægelser gennem ledger + idempotensnøgle.
- [ ] Rate limit på enhver handling, der koster penge, sender beskeder eller kan misbruges til enumerering.
- [ ] Svar og fejl afslører ikke interne detaljer, versioner eller årsagen til afvisning.
- [ ] Følsomme handlinger skriver til audit-log (hvem, hvad, hvorfra) – uden hemmeligheder i metadata.
- [ ] Ingen `dangerouslySetInnerHTML` med dynamisk indhold. Ingen `eval`. Ingen server-side hentning af bruger-URL'er.
- [ ] Tests dækker misbrugstilfælde (fremmed bruger, forkert rolle, gentaget request, samtidighed), ikke kun den lykkelige vej.

## 7. Hemmeligheder og konfiguration

- Hver miljø har egne nøgler (lokal/preview/staging/prod). **Preview-deploys må ikke have produktionsdata eller -nøgler**, og skal være bag login.
- Hemmeligheder ligger i hostingplatformens secret store (senere en secret manager med rotation). `.env.example` indeholder kun pladsholdere.
- Konfiguration valideres ved opstart (`loadEnv`) og **nægter at starte** ved ugyldig/farlig konfiguration (fx dev-login i produktion, tom IP-allowlist) – verificeret med HTTP-test (500, ikke 200).
- Roter ved mistanke og planlagt (Stripe-nøgler, webhook-secret, DB-adgangskoder). Dokumentér hvem der kan rotere hvad.

## 8. Logning, overvågning og alarmer

**Log (uden PII):** login/fejlede login, ændring af følsomme profilfelter, admin-adgang og -afvisninger, alle pengehandlinger, webhook-afvisninger, payment-mismatch, outbox-fejl, rate limit-hits.
**Log aldrig:** adgangskoder, tokens, kort-/bankdata, rå request-bodies, fulde e-mails (brug `maskEmail`).

| Alarm (forslag) | Hvorfor |
|---|---|
| `payment.mismatch` eller `payment.late` i audit-log | Forsøg på underbetaling / forsinket betaling |
| Outbox-job i status `failed` | Penge sidder fast |
| Ledger-afstemning ≠ Stripe | Bogholderifejl eller svindel |
| Stigning i 403/404 på admin | Scanning/forsøg på indbrud |
| Mange fejlede logins fra få IP'er/konti | Credential stuffing |
| Webhook-signaturfejl i bølger | Forsøg på forfalskning |
| Ny medarbejder oprettet / rolle ændret | Rettighedsændring |
| `risk_level = high`-beskeder i stigende antal | Svindelkampagne |

Fejlsporing (fx Sentry) **med PII-scrubbing** og `redactForLog` før data sendes ud.

## 9. Hændelsesberedskab

1. **Opdag og klassificér** (sev 1 = penge/persondata i fare; sev 2 = udnyttelig sårbarhed; sev 3 = øvrigt).
2. **Afgræns med kill switches** (skal bygges i admin): pause udbetalinger (stop outbox-topic `stripe.transfer`), frys annonce/bruger, slå oprettelse af konti fra, slå checkout fra.
3. **Bevar beviser:** audit-log og ledger er uforanderlige; tag snapshots før oprydning.
4. **Roter** kompromitterede nøgler og tilbagekald sessioner.
5. **Underret:** ved brud på persondata skal Datatilsynet normalt have besked **senest 72 timer** efter, at I blev opmærksomme (GDPR art. 33), og berørte brugere underrettes ved høj risiko. Stripe underrettes ved betalingsrelaterede hændelser.
6. **Efterbehandling:** skriftlig post mortem uden skyld, og tilføj en test, der ville have fanget det.

## 10. Testplan

| Lag | Hvad | Status |
|---|---|---|
| Enhedstests | Domæne (penge, tilstande, ledger), validering, sikkerhedsbibliotek | ✅ |
| Integrationstests | Ægte Postgres (PGlite): constraints, triggers, roller, betalingsflow, samtidighed | ✅ |
| Mutationstjek | Fjern en kontrol og se, at præcis den test fejler (gjort for triggers og beløbstjek) | ✅ manuelt – gentag ved nye kontroller |
| HTTP-tests mod produktionsbuild | Headers, CSP-nonce, webhook-afvisninger, admin-afvisninger, fail-closed, bypass-forsøg | ✅ manuelt – automatiser i CI (Playwright/curl) ⬜ |
| SAST/afhængigheder | CodeQL, `npm audit`, Dependabot, gitleaks | 🟡 workflows skrevet, ikke kørt på GitHub endnu |
| DAST | OWASP ZAP mod staging | ⬜ |
| Penetrationstest | Ekstern, **før lancering**, med fokus på betaling, admin og kontoovertagelse | ⬜ |
| Bug bounty / responsible disclosure | `SECURITY.md` findes; evt. program efter lancering | 🟡 |
| Katastrofeøvelser | Gendan database fra backup; rotér alle nøgler; simulér webhook-nedetid | ⬜ |

## 11. Go-live-checkliste (alle skal være afkrydset)

- [ ] Auth med passkeys/MFA bygget og pen-testet; step-up på følsomme handlinger.
- [ ] Alle endpoints har ejerskabstjek **og** tests for fremmed bruger (IDOR).
- [ ] Rate limits aktive (delt store, ikke in-memory) på login, tilmelding, checkout, beskeder, upload, søgning.
- [ ] Upload-pipeline: omkodning, pixelloft, scanning, separat domæne med `nosniff`.
- [ ] Stripe Radar/3-D Secure slået til; `charge.dispute.*` håndteres; daglig afstemning kører og alarmerer.
- [ ] Udbetalingsgrænser og -pauser for nye sælgere; KYC via Connect.
- [ ] Cloudflare Access på admin (SSO+MFA), WAF-regler, origin låst til Cloudflare, DNSSEC/CAA, SPF/DKIM/DMARC `p=reject`.
- [ ] Databaseroller (`roles.sql`) anvendt, TLS påkrævet, privat netværk/IP-allowlist, PITR slået til, **gendannelse øvet**.
- [ ] Branch protection + CODEOWNERS-review slået til; GitHub Actions pinnet til SHA; Dependabot/CodeQL/gitleaks grønne.
- [ ] Secrets pr. miljø; preview-miljøer uden produktionsdata og bag login.
- [ ] Alarmer og on-call; hændelsesplan læst og øvet; kill switches findes.
- [ ] Ekstern penetrationstest gennemført og fund udbedret.
- [ ] Juridisk gennemgang: GDPR, DSA, DAC7, vilkår, betalingsregulering, moms.

## 12. Kendte begrænsninger i skelettet (ærligt)

- **Login mangler passkeys og MFA**, og der er ingen rigtig mailudbyder (kun konsol-mail, som afvises i produktion). Admin bruger Cloudflare Access (verificeret i tests med egne nøgler, **ikke mod Cloudflares rigtige nøgler**).
- E-mails sendes synkront i requesten. Det giver en målbar tidsforskel ved "glemt adgangskode" for kendte/ukendte e-mails. Flyt afsendelse til outbox/kø.
- `PgRateLimiter` bruger en række-lås, der er nødvendig i rigtig Postgres; PGlite (én forbindelse) kan ikke bevise den. Test mod rigtig Postgres i CI.
- Ingen besked ved login fra ny enhed, og ingen udbetalingspause efter nulstilling endnu.
- `style-src-attr 'unsafe-inline'` er slået til, fordi UI-kittet bruger `style`-attributter. Scripts er strengt nonce-beskyttede. Kan strammes ved at flytte inline-styles til CSS-klasser.
- Webhook-håndteringen dækker `payment_intent.succeeded` og `.canceled`. Disputes, refunds, `account.updated` (Connect-onboarding) og payout-events mangler.
- Web-rollens `UPDATE` på `users` er ikke kolonnebegrænset (fx `status`). Stram når auth-tabellerne er på plads.
- Admin har endnu ingen ændrende handlinger (derfor ingen CSRF-/fire-øjne-flow at teste). Biblioteket er klar.
- Worker-processen, der kalder `runOutbox` jævnligt, er ikke skrevet.
- Cloudflare-, DNS-, hosting- og branch protection-indstillinger er beskrevet i [05-infrastructure.md](05-infrastructure.md), men ikke sat op.
