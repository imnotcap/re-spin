# 05 · Infrastruktur og drift

> Dette er et **opsætningsforslag**. Intet af det er sat op endnu. Tjek altid leverandørernes aktuelle funktioner og priser.

## Miljøer

| Miljø | Formål | Data | Hemmeligheder |
|---|---|---|---|
| Lokal | Udvikling | PGlite/lokal Postgres, Stripe **test** | `.env.local` (ikke i git) |
| Preview (pr. PR) | Gennemgang | Syntetiske data, Stripe test | Egne test-nøgler. **Bag login. Aldrig produktionsdata.** |
| Staging | Test før release, DAST | Anonymiserede/syntetiske data | Egne nøgler, Stripe test |
| Produktion | Rigtige brugere | Rigtige data, EU-region | Secret store, rotation |

## Hosting (forslag)

| Del | Valg | Noter |
|---|---|---|
| `apps/web`, `apps/admin` | Vercel (eller tilsvarende Next-host) | To separate projekter/domæner. Preview-beskyttelse slået til. Produktionssecrets kun i produktion |
| Worker (`runOutbox`, timers) | Container-host (Fly.io/Railway/AWS ECS) | Kan ikke være serverless; mindst 2 instanser; sikre at to workere ikke dobbeltudfører (outbox har idempotens) |
| PostgreSQL | Managed, **EU-region**, PITR, TLS påkrævet | Privat netværk eller IP-allowlist; separat læse-replika senere |
| Objektlager + CDN | S3-kompatibelt + CDN på separat domæne | Private uploads → offentlige derivater efter scanning |
| Cache/rate limit | Redis (Upstash) | Delt rate limiter bag `RateLimiter`-interfacet |
| E-mail | Transaktionel udbyder med DKIM | SPF/DKIM/DMARC |

## Domæner og DNS

| Post | Formål |
|---|---|
| `videro.dk`, `www` | Web (Cloudflare proxy) |
| `admin.videro.dk` | Admin (Cloudflare proxy + Access) |
| Separat CDN-domæne | Brugerindhold (cookie-løst) |
| `status.videro.dk` | Statusside |
| MX/SPF/DKIM/DMARC | E-mail; DMARC `p=reject` når det er verificeret |
| **CAA** | Kun valgte certifikatudstedere |
| **DNSSEC** | Slået til hos registrar |

**Hygiejne:** ingen dinglende CNAME-poster (subdomæne-overtagelse), registrar-lås, 2FA (helst hardware-nøgle) på registrar og Cloudflare, mindst to administratorer. **HSTS preload** kræver, at *alle* subdomæner kan køre HTTPS – slå det først til, når listen er gennemgået.

## Cloudflare – opsætning

1. **DNS** proxied (orange sky) for web og admin.
2. **Access-applikation for `admin.videro.dk`:** politik = specifikke e-mails/grupper via jeres identitetsudbyder, **MFA påkrævet**, sessionsvarighed kort (fx 8 t). Noter *Application Audience (AUD) tag* og team-domæne → `ACCESS_AUD`, `ACCESS_TEAM_DOMAIN`.
3. **WAF custom rule (ekstra lag):** `host == admin.videro.dk AND ip.src NOT IN {kontor/VPN}` → Block. (Appen håndhæver også `ADMIN_IP_ALLOWLIST`.)
4. **Rate limiting rules:** login, tilmelding, adgangskode-reset, checkout, beskeder, søgning (sæt grænser efter `LIMITS` i `packages/security`).
5. **Bot management / Turnstile** på tilmelding, login, annonce-oprettelse.
6. **Origin låst til Cloudflare:** brug Cloudflare Tunnel eller Authenticated Origin Pulls / kun Cloudflares IP-intervaller, så angribere ikke kan ramme serveren direkte og omgå WAF/Access.
7. **Klient-IP:** sæt `ADMIN_IP_HEADER=cf-connecting-ip`. Det er kun sikkert, når punkt 6 er på plads (ellers kan klienten selv sætte headeren).
8. **TLS:** Full (strict), min. TLS 1.2, "Always use HTTPS", automatisk HTTPS-omskrivning.
9. **Caching:** cache aldrig HTML for indloggede brugere eller admin; respektér `Cache-Control: no-store` (appen sætter det).

## Database

**Roller:** kør `packages/db/sql/roles.sql` efter migrationer. Opret derefter login-brugere (adgangskoder fra secret store), én rolle pr. app:

```sql
CREATE USER respin_web_app    LOGIN PASSWORD '…' IN ROLE respin_web;
CREATE USER respin_admin_app  LOGIN PASSWORD '…' IN ROLE respin_admin;
CREATE USER respin_worker_app LOGIN PASSWORD '…' IN ROLE respin_worker;
```

**Migrationer:** køres af en separat `migrator`-bruger (ejer af skemaet) i CI/CD, aldrig af appen. Brug *expand/contract* (tilføj → migrér data → fjern), så udrulning aldrig kræver nedetid. Hver migration reviewes (CODEOWNERS).

**Backup og gendannelse:** PITR slået til; dagligt snapshot kopieret til en anden konto/region; **gendannelse øves kvartalsvist** og tiden måles. En backup, der ikke er afprøvet, er ikke en backup.

**Overvåg:** forbindelser, langsomme queries, replikeringsforsinkelse, diskplads, `outbox` ældre end X min., `stripe_events` i status `failed`.

## CI/CD og kodebase

`.github/workflows`: `ci.yml` (installér med `npm ci --ignore-scripts`, build UI, typecheck, test, build af web/admin/showcase), `dependency-audit`, `codeql.yml` (ugentlig + PR), `secrets-scan.yml` (gitleaks over hele historikken). Dependabot opdaterer npm og GitHub Actions ugentligt.

**GitHub-indstillinger der skal slås til manuelt** (kan ikke sættes fra koden):

- [ ] Branch protection på `main`: PR kræves, mindst 1 godkendelse, **Code Owners-review**, status checks (`verify`, `dependency-audit`, CodeQL) skal bestå, ingen force-push.
- [ ] Private vulnerability reporting + Dependabot alerts + secret scanning + push protection.
- [ ] 2FA påkrævet for alle med skriveadgang; mindst mulig adgang.
- [ ] Environments (`staging`, `production`) med påkrævet godkendelse til produktionsudrulning; secrets scoped til miljøet.
- [ ] **Pin GitHub Actions til commit-SHA** (Dependabot holder dem opdateret). Workflows bruger i dag versionstags.
- [ ] Workflows fra forks får ingen secrets.

## Konfiguration pr. app

| Variabel | web | admin | worker | Noter |
|---|:-:|:-:|:-:|---|
| `DATABASE_URL` | ✅ | ✅ | ✅ | Forskellig bruger pr. app (se ovenfor) |
| `STRIPE_SECRET_KEY` | ✅ | | ✅ | Brug **restricted key** med kun nødvendige rettigheder |
| `STRIPE_WEBHOOK_SECRET` | ✅ | | | Én pr. endpoint |
| `ADMIN_ALLOWED_HOSTS`, `ADMIN_IP_ALLOWLIST`, `ADMIN_IP_HEADER` | | ✅ | | Tom allowlist i produktion = nægt alle |
| `ACCESS_TEAM_DOMAIN`, `ACCESS_AUD` | | ✅ | | Fra Cloudflare Access |
| `CSP_IMG_SRC` | ✅ | | | CDN-domæne til billeder |
| `APP_URL` | ✅ | | | Kanonisk https-adresse til links i mails (aldrig fra Host-headeren) |
| `MAIL_TRANSPORT` | ✅ | | | `console` afvises i produktion – mailudbyder skal tilføjes |
| `MFA_ENCRYPTION_KEY` | ✅ | | | 32 byte (`openssl rand -base64 32`). Sikkerhedskopiér separat; skift kun med migrering |
| `PWNED_CHECK`, `TRUSTED_IP_HEADER`, `TRUSTED_PROXIES` | ✅ | | | HIBP kræver udgående adgang til `api.pwnedpasswords.com` |
| `ADMIN_DEV_EMAIL`, `ADMIN_DEV_ROLE` | | dev | | **Afvises i produktion** (appen starter ikke) |

## Observabilitet og drift

- Struktureret logning (JSON) gennem `redactForLog`. Korrelations-id pr. request.
- Metrics: p50/p95-svartid, fejlrate, kø-dybde (`outbox`), betalingskonvertering, mislykkede webhooks.
- Uptime-overvågning på `/api/health` (afslører ingen konfiguration) + statusside.
- Alarmer og on-call: se [02-security.md §8](02-security.md#8-logning-overvågning-og-alarmer).
- **Omkostningsværn:** budgetalarmer hos hosting/Stripe/CDN; rate limits beskytter også regningen.
