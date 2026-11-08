# 07 · Værktøjer, priser og skalering

> **Status:** prisoverslag pr. november 2026, hentet fra leverandørernes sider og tredjeparts-prisoversigter. Mange tal kommer fra tredjepart og var **indbyrdes uenige** – de er markeret ⚠️. Tjek altid leverandørens egen prisside, før I binder jer.
> **Valuta:** 1 EUR ≈ 7,46 DKK (fast kurs). **1 USD ≈ 6,5 DKK er en antagelse** – ret den til dagskursen.
> **Ikke regnet med:** løn, jurist, revisor, penetrationstest, markedsføring, moms. Indhent tilbud på de tre første.

## 1. Princippet: skalér med en skyder, ikke en ombygning

Målet er, at I kan vokse ved at **ændre en indstilling eller et beløb**, ikke ved at skrive systemet om. Det kræver tre ting, som skelettet allerede er bygget efter:

1. **Tilstandsløse app-servere.** Sessioner, rate limits og jobs ligger i databasen, ikke i serverens hukommelse. Derfor kan der køre 1 eller 100 kopier af web-appen samtidig.
2. **Compute og lager er adskilt.** Databasen, billederne og app-serverne skaleres hver for sig.
3. **Standarder overalt, så I kan flytte.** Ren PostgreSQL (ingen leverandør-specifikke funktioner), S3-API til billeder, Redis-protokol, Docker til workeren. Bliver en leverandør for dyr, kan I flytte uden at skrive koden om.

## 2. Værktøjer pr. område

| Område | Valg | Hvorfor | Alternativ | Pris (kilde i §8) |
|---|---|---|---|---|
| Web + admin hosting | **Vercel Pro** | Next.js-native, auto-skalering, preview-miljøer pr. PR | Railway/Fly (containere), AWS | $20 pr. udvikler/md. inkl. $20 forbrug, 1 TB trafik og 10 mio. edge-requests. ⚠️ Overforbrug: kilder uenige ($0,15/GB eller $40/100 GB). **Hobby må ikke bruges kommercielt** |
| Database | **Neon** (Postgres, EU) | Autoskalering (min/maks CU), lager vokser selv, læse-replikaer, database-branches til preview-miljøer | Supabase, AWS RDS/Aurora | Launch: ~$0,106 pr. CU-time + $0,35/GB-md., intet minimum. Scale: ~$0,222 pr. CU-time. Gratis: 100 CU-timer + 0,5 GiB ⚠️ |
| Worker (outbox, billeder, timere) | **Railway** | Docker-container, skyder for vCPU/RAM, flere kopier | Fly.io, Render | Pro $20/bruger/md. inkl. $20 forbrug; ~$20 pr. vCPU-md. og ~$10 pr. GB RAM-md. |
| DNS, WAF, DDoS, admin-adgang | **Cloudflare** + **Zero Trust Access** | Beskyttelse foran alt; Access giver SSO+MFA til admin | – | Gratis plan; Pro ~$20–25/md. ⚠️. Access gratis op til **50 brugere**, derefter $7/bruger/md. |
| Billeder | **Cloudflare R2** + egen omkodning i worker | **Ingen udgående trafik-afgift**, S3-kompatibel | AWS S3, Cloudflare Images | $0,015/GB-md.; skriv $4,50 pr. mio.; læs $0,36 pr. mio.; gratis: 10 GB + 1 mio./10 mio. operationer (officiel prisside) |
| Rate limits/cache (senere) | **Upstash Redis** | Betal pr. kommando; samme `RateLimiter`-interface | Redis på Railway | ~$0,20 pr. 100.000 kommandoer ⚠️; faste planer fra ~$10/md. |
| Transaktionsmails | **Resend** (eller Postmark) | Simpel API, DKIM | Postmark, Brevo (EU) | Resend: gratis 3.000/md. (maks. 100/dag); Pro $20 for 50.000; $0,90 pr. 1.000 ekstra ⚠️. Postmark: $15 for 10.000 ⚠️ |
| Fejlovervågning | **Sentry** | Fejl + performance, PII-scrubbing | Better Stack | Team ~$26–29/md. for 50.000 fejl ⚠️; gratis: 5.000 fejl |
| Chat i realtid | **Ably** | Managed websockets | Pusher, egen WS-server | Gratis 6 mio. beskeder/md.; derefter $2,50 → $0,50 pr. mio. (Ablys egen side) |
| Søgning (fra fase 3) | **Postgres** → **Typesense Cloud** | Start gratis i Postgres; skift når volumen kræver det | Meilisearch Cloud, Elasticsearch | Typesense: ressourcebaseret pris ⚠️ (kilder: fra ~$0,05 pr. node-time) |
| Betalinger | **Stripe Connect** + MobilePay | Se 03-payments | Mangopay, Adyen | Kort (EEA): ~1,5 % + 1,80 kr. ⚠️ (premium-kort ~1,9 %). MobilePay: **35 kr./md.** + MobilePay-gebyr pr. transaktion (sats ikke fundet). Connect-gebyrer for DK: **ikke fundet – spørg Stripe** |
| MitID (certificering) | **Criipto** (formidler) | Certificeret MitID-broker | Signicat | Opstart 1.200 kr.; 0,28 kr. pr. login + abonnement (beløb ikke fundet) |
| Fragt | **Shipmondo** | Ét API til PostNord/DAO/GLS, labels, tracking | Direkte aftaler | Betal pr. label (+ evt. abonnement – aktuelle beløb ikke fundet). Køber betaler fragten |
| Baggrundsfjerner | **I browseren eller selv-hostet model** | Betal-pr.-billede-API'er bliver ekstremt dyre ved volumen (se §4) | remove.bg API | remove.bg: ⚠️ ~$0,10–0,23 pr. billede |
| Kode, CI | GitHub | Allerede i brug | – | Gratis for nu |
| Apps (fase 4) | Apple Developer + Google Play | Påkrævet for app stores | – | Apple $99/år; Google $25 én gang |

## 3. Månedlige omkostninger pr. fase

Overslag i USD (med DKK ved 1 USD ≈ 6,5 kr.). **Kortgebyrer er ikke med her** – de afhænger af omsætningen og står i §4.

### A · Udvikling (nu → lancering)
| Post | Pr. md. |
|---|---|
| Vercel Pro, 1 udvikler | $20 |
| Neon gratis plan · Cloudflare gratis · R2 gratis kvote · Resend gratis · Sentry gratis · GitHub gratis | $0 |
| Railway Hobby (kun hvis worker skal køre) | $0–5 |
| **I alt** | **≈ $20–25 ≈ 130–165 kr.** |

### B · Lancering (≈ 1.000 aktive brugere, 5.000 annoncer, 300 ordrer/md., 20 GB billeder)
| Post | Antagelse | Pr. md. |
|---|---|---|
| Vercel Pro | 2 udviklere, trafik inden for det inkluderede | $40 |
| Neon Launch | gns. 0,5 CU døgnet rundt (≈ $39) + 5 GB lager + små dev-branches | ≈ $45 |
| Railway Pro | 1 worker, 0,5 vCPU / 0,5 GB (dækkes af inkluderet forbrug) | $20 |
| Cloudflare Pro | managed WAF-regler (anbefales for en markedsplads) | ≈ $25 |
| Resend Pro | op til 50.000 mails | $20 |
| Sentry Team | | ≈ $29 |
| R2, Ably, Upstash | inden for gratis kvoter / rate limits i Postgres | $0–5 |
| MobilePay via Stripe | fast månedsgebyr | 35 kr. |
| MitID via Criipto | 0,28 kr. pr. certificering + abonnement (ukendt) | ? |
| **I alt** | | **≈ $180–190 ≈ 1.200–1.300 kr. + MitID-abonnement** |

### C · Vækst (≈ 25.000 aktive, 150.000 annoncer, 8.000 ordrer/md., 500 GB billeder)
| Post | Antagelse | Pr. md. |
|---|---|---|
| Vercel Pro | 4 udviklere + overforbrug (trafik/requests) ⚠️ | ≈ $200–250 |
| Neon | gns. 2 CU (≈ $155) + læse-replika ~1 CU (≈ $77) + 40 GB | ≈ $250 (≈ $500 på Scale-planen) |
| Railway | 2 workere à 1 vCPU / 1 GB (billedbehandling) + seats | ≈ $80–100 |
| Typesense Cloud | lille HA-klynge (3 noder) ⚠️ | ≈ $110 |
| Ably | ≈ 20 mio. beskeder | ≈ $65 |
| Upstash | rate limits + cache flyttet fra Postgres | ≈ $50–100 |
| R2 | 500 GB + operationer (CDN-cache tager de fleste læsninger) | ≈ $25 |
| Cloudflare Pro | | ≈ $25 |
| Resend | ≈ 150.000 mails | ≈ $90 |
| Sentry | flere fejl/performance-data | ≈ $50–80 |
| **I alt** | | **≈ $950–1.200 ≈ 6.200–7.800 kr.** |

### D · Stor (≈ 250.000 aktive, 2 mio. annoncer, 80.000 ordrer/md., 5 TB billeder)
Størrelsesorden **$8.000–20.000/md. (≈ 50.000–130.000 kr.)**. På dette niveau forhandler I Enterprise-aftaler (Vercel, Neon/AWS, Sentry), overvejer at flytte web til containere i egen cloud-konto, køber reserveret database-kapacitet og har en dedikeret søge-klynge. Tallene er grove – lav et nyt overslag ud fra målt forbrug, når I nærmer jer.

**Perspektiv:** i fase D giver 80.000 ordrer à ~18 kr. i køberbeskyttelse ≈ 1,4 mio. kr./md. (plus fremhævning) i bruttogebyrer. Infrastrukturen er ikke den store post – **kortgebyrer, svindel og kundeservice er**.

## 4. Økonomi pr. ordre (det vigtigste regnestykke)

Eksempel: vare til **300 kr.**, lille pakke **39 kr.**, standard EEA-kort.

| | Beløb |
|---|---|
| Køber betaler | 300 + 18 (5 % + 3 kr.) + 39 = **357 kr.** |
| Videros gebyrer | 18 (køber) + 0 (sælger, 0 % kommission) = **18 kr.** (+ evt. fremhævning) |
| Stripe kortgebyr ⚠️ | 1,5 % af 357 + 1,80 = **≈ 7,16 kr.** (premium-kort ≈ 8,58 kr.) |
| Connect-gebyrer (overførsel/aktiv konto) | **ukendt for DK – spørg Stripe** |
| Fragt | 39 kr. ind, labelpris ud (forskellen er gevinst eller tab) |
| **Tilbage før moms, Connect, svindel og support** | **≈ 10,8 kr.** |
| Hvis gebyrerne er momspligtige (25 %, **bekræft med revisor**) | 18 / 1,25 − 7,16 ≈ **7,2 kr.** |

Konklusioner:
- **Faste driftsomkostninger ved lancering (≈ 1.300 kr.) er dækket ved ca. 100–140 ordrer/md.**
- Det er købers gebyr, der betaler for betalingerne. Et lavere køber-gebyr kræver en anden prismodel.
- **Baggrundsfjerneren må ikke være et betal-pr.-billede-API.** Ved 20.000 nye annoncer/md. à 3 billeder koster remove.bg ⚠️ ~$6.000–14.000/md. – mere end hele resten af infrastrukturen. Kør modellen i brugerens browser (WASM/ONNX) eller selv-hostet i workeren.

## 5. Opgraderingsplan pr. komponent

| Komponent | Sådan opgraderer I (uden kodeændring) | Tegn på at det er tid | Næste trin | Exit-plan hvis det bliver for dyrt |
|---|---|---|---|---|
| Web/admin (Vercel) | Skalerer automatisk; sæt **forbrugsloft og alarmer** | Overforbrug > ~30 % af regningen | Cache annoncesider (ISR) → færre funktionskald | `output: 'standalone'` → Docker på Railway/AWS |
| Database (Neon) | Hæv **maks. CU** (autoskalering), tilføj **læse-replika**, lager vokser selv | CPU > 70 % i spidsbelastning, p95-svartid stiger, forbindelser tæt på loftet | Læse-replika til feed/søgning; Scale-plan for SLA | `pg_dump`/logisk replikering → RDS/Aurora (ren Postgres, ingen låsning) |
| Forbindelser | Brug Neons **pooled** forbindelses-URL; `DB_POOL_MAX` lille pr. funktion | "too many connections" | – | PgBouncer |
| Worker (Railway) | Skyder for vCPU/RAM, flere kopier | Outbox-kø ældre end ~1 min.; billedbehandling > 30 s | Separate workere pr. opgavetype | Samme Docker-image på Fly/AWS |
| Billeder (R2) | Ubegrænset; ingen trafikafgift | – | Livscyklus-regler (slet originaler efter omkodning) | S3-API → enhver udbyder |
| Rate limits/cache | Flyt fra Postgres til Upstash (samme interface) | Rate limit-skrivninger fylder i databasen | Cache af feed/annoncer | Redis hvor som helst |
| Søgning | Postgres → Typesense (indeks bygges fra DB) | > ~100.000 annoncer eller søge-p95 > 300 ms | Flere noder/regioner | Meilisearch/Elasticsearch |
| Mails | Højere plan | Tæt på kvoten | Dedikeret IP | Skift udbyder = én env-variabel |
| Chat (Ably) | Betaler pr. besked | – | – | Egen WS-server + Redis pub/sub |

**Altid:** sæt budgetalarmer hos hver udbyder (50 %/80 %/100 %), og gennemgå regningen månedligt mod faktisk trafik.

## 6. Hvad koden allerede gør for at kunne skalere – og hvad der mangler

| | |
|---|---|
| ✅ | Tilstandsløs web-app (sessioner i DB) → vandret skalering |
| ✅ | Al konfiguration via miljøvariabler (fx `DB_POOL_MAX`) |
| ✅ | `RateLimiter`-interface → Postgres i dag, Redis i morgen uden kodeændring i kalderne |
| ✅ | Outbox + separat worker → tunge/eksterne opgaver blokerer ikke web-requests |
| ✅ | Ren PostgreSQL + Drizzle-migrationer (expand/contract) → kan flyttes mellem udbydere |
| ✅ | Server-genererede billednøgler + S3-API → kan flyttes mellem lagre |
| ⬜ | Opdeling af læs/skriv (`createDb` med læse-replika) til feed og søgning |
| ⬜ | Caching af offentlige sider (ISR) – kræver hash-baseret CSP på de sider (nonce kræver dynamisk rendering) |
| ⬜ | `output: 'standalone'` + Dockerfile, så web kan flyttes fra Vercel på en dag |
| ⬜ | Partitionering af `messages`, `audit_log`, `ledger_entries`, `rate_limits` når de passerer ~10–50 mio. rækker |
| ⬜ | Metrics og dashboards (svartider, kø-længde, DB-belastning) – kan ikke skalere det, I ikke måler |

## 7. Engangsudgifter og årlige poster

| Post | Pris |
|---|---|
| Apple Developer Program (fase 4) | $99/år |
| Google Play-konto (fase 4) | $25 én gang |
| MitID via Criipto | 1.200 kr. opstart |
| Domæner (`videro.dk` + CDN-domæne) | lille årligt beløb – tjek registrar |
| Penetrationstest før lancering, jurist, revisor | **indhent tilbud** – budgettér dem som de største engangsposter |

### Et advarende eksempel på leverandørrisiko
Hetzner – længe det billigste valg til egne servere – hævede priserne to gange i 2026 (ca. 30–37 % i april og 2–2,7× på CPX/CCX i juni). Det er netop derfor, planen bygger på **standarder og exit-planer**: prisen på en leverandør kan ændre sig, men så kan I flytte.

## 8. Kilder

- Vercel: [Hobby er ikke til kommerciel brug](https://vercel.com/docs/plans/hobby) · [fair use](https://vercel.com/docs/limits/fair-use-guidelines) · [prisoversigt 2026 (tredjepart)](https://www.activepieces.com/blog/vercel-pricing-in-2026-how-the-costs-scale.md) · [prisforklaring (tredjepart)](https://deploywise.dev/blog/vercel-pricing-explained)
- Neon: [priser 2026 (tredjepart)](https://selfhost.dev/neon-pricing-cost-of-serverless-postgres/) · [anmeldelse](https://www.jetadmin.io/blog/neon-review/) · [Postgres-hosting sammenligning](https://www.bytebase.com/blog/postgres-hosting-options-pricing-comparison.md)
- Supabase: [priser 2026 (tredjepart)](https://makerkit.dev/blog/saas/supabase-pricing) · [anmeldelse](https://www.jetadmin.io/blog/supabase-review/)
- Railway: [officiel pris](https://railway.com/pricing?utm=airanks.net) · [docs](https://docs.railway.app/reference/pricing)
- Cloudflare: [R2-priser (officiel)](https://developers.cloudflare.com/r2/pricing) · [Zero Trust-planer](https://www.cloudflare.com/plans/sase-zero-trust.md) · [prisoversigt 2026 (tredjepart)](https://www.activepieces.com/blog/cloudflare-pricing-2026-plans-and-what-you-pay.md)
- Upstash: [Redis-priser](https://upstash.com/pricing/redis)
- Resend/Postmark: [Resend 2026 (tredjepart)](https://automationatlas.io/answers/resend-pricing-explained-2026/) · [Postmark 2026 (tredjepart)](https://automationatlas.io/answers/postmark-pricing-explained-2026/)
- Sentry: [priser 2026 (tredjepart)](https://www.activepieces.com/blog/sentry-pricing-2026-developer-team-business-plans.md)
- Ably: [officiel pris](https://ably.com/pricing)
- Typesense: [prisoversigt (tredjepart)](https://api-pricing.pages.dev/vendor/typesense/)
- Stripe: [Connect-priser](https://stripe.com/sv-no/connect/pricing) · [MobilePay (inkl. månedsgebyr)](https://docs.stripe.com/payments/mobilepay.md) · [DKK-kortgebyrer (tredjepart, aug. 2025)](https://help.dubsado.com/en/articles/8901346-dubsado-payments-processing-fees-in-2-0)
- MitID: [Criipto MitID](https://criipto.com/mitid) · [MitID broker-priser](https://www.mitid.dk/en-gb/broker/prices/)
- Shipmondo: [pay-as-you-go](https://shipmondo.com/pricing/)
- remove.bg: [prisoversigt (tredjepart)](https://costbench.com/software/ai-media-apis/remove-bg-api/)
- App stores: [Apple Developer-gebyr](https://studio.adalo.com/blog/apple-developer-program-guide) · [Google Play-gebyr](https://magora-systems.com/google-play-developer-account-cost/)
- Hetzner: [prisstigning juni 2026](https://northflank.com/blog/hetzner-cloud-server-price-increases) · [april 2026](https://www.tomshardware.com/tech-industry/hetzner-to-raise-prices-by-up-to-37-percent-from-april-1)
