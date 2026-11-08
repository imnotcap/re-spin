# 08 · Sæt login i drift (Vercel + Neon + Resend)

GitHub Pages kan kun vise statiske filer. Derfor har testversionen på <https://imnotcap.github.io/re-spin/> **ingen login-knap**. Login, konto, passkeys og to-trins-login kræver en server og en database. Valgene bag (Vercel Pro, Neon i EU og Resend) står i [07-tools-and-costs.md](07-tools-and-costs.md).

Det er den samme app (`apps/web`) i begge tilfælde:

| | Server-byg (`npm run build -w web`) | Statisk byg (`npm run build:static -w web`) |
|---|---|---|
| Hvor | Vercel (eller anden Node-host) | GitHub Pages |
| Sider | alle offentlige sider + `/log-ind/`, `/opret-konto/`, `/glemt-adgangskode/`, `/ny-adgangskode/`, `/bekraeft-email/`, `/konto/`, `/konto/sikkerhed/`, `/api/*` | kun de offentlige sider |
| Sikkerhed | nonce-CSP, HSTS, X-Frame-Options osv. fra `proxy.server.ts` | Pages kan ikke sætte headers |

Filer, der hedder `*.server.tsx` eller `*.server.ts`, er kun med i server-bygget. Det styres af `pageExtensions` i `apps/web/next.config.mjs`.

## 1. Database (Neon, region EU – Frankfurt)

1. Opret et projekt i **AWS Europe Central (Frankfurt)**. Ejer-brugeren (fx `neondb_owner`) bruges **kun** til migrationer.
2. Kør migrationerne (se punkt 5). Kør derefter `packages/db/sql/roles.sql` én gang som ejer i Neons SQL-editor. Det opretter rollerne `respin_web`, `respin_admin` og `respin_worker` med mindste privilegium.
3. Opret en login-bruger til hjemmesiden, med en lang tilfældig adgangskode:
   ```sql
   CREATE USER respin_web_app LOGIN PASSWORD '<fra password manager>' IN ROLE respin_web;
   ```
4. Til `DATABASE_URL` bruges **pooler-adressen** (værtsnavn med `-pooler`) for `respin_web_app`, med `?sslmode=require`. Klienten kører med `prepare: false`, så den virker bag Neons pooler.

## 2. Mail (Resend)

1. Tilføj og verificér domænet (fx `videro.dk`) med de SPF- og DKIM-records, Resend viser. Sæt også en DMARC-record (`v=DMARC1; p=quarantine`).
2. Opret en API-nøgle med **kun "Sending access"** til det domæne.

Appen nægter at starte i produktion med `MAIL_TRANSPORT=console`, så ingen links ender i en log.

## 3. Billeder (Vercel Blob)

Annoncefotos ligger i Vercel Blob, på et andet domæne end siden selv. En fil kan derfor aldrig køre som en del af siden.

1. Opret et Blob-lager: Vercel → Storage → **Create** → **Blob**, med navnet fx `re-spin-billeder`.
2. Forbind det kun til projektet `re-spin` og kun til **Production**. Vercel sætter så selv `BLOB_READ_WRITE_TOKEN`.

CSP'en tillader automatisk billeder fra lagerets adresse, som udledes af tokenet. Hvert billede omkodes til WebP i to størrelser (1600 og 480 px), før det gemmes. Det fjerner EXIF og GPS-position.

## 4. Hosting (Vercel)

1. Importér repoet og sæt **Root Directory = `apps/web`**. `apps/web/vercel.json` står for install og build (hele monorepoet, `npm ci --ignore-scripts`) og for regionen `fra1`.
2. Sæt miljøvariablerne under *Production*. Sæt dem **ikke** under *Preview*, så preview-byg aldrig rører produktionsdata.

| Variabel | Værdi | Hemmelig |
|---|---|---|
| `DATABASE_URL` | Neon pooler-URL for `respin_web_app` | ja |
| `DB_POOL_MAX` | `5` | |
| `APP_URL` | `https://videro.dk`. Skal være https. Bruges i links i mails og udledes aldrig af Host-headeren. | |
| `MAIL_TRANSPORT` | `resend` | |
| `RESEND_API_KEY` | `re_…` | ja |
| `MAIL_FROM` | `Videro <noreply@videro.dk>`. Skal være på det verificerede domæne. | |
| `MFA_ENCRYPTION_KEY` | `openssl rand -base64 32`. Krypterer TOTP-hemmeligheder. Gem den også i en password manager; skift den aldrig uden migrering. | ja |
| `PWNED_CHECK` | `on` | |
| `TRUSTED_IP_HEADER` | `x-real-ip`. Vercel sætter den selv. Brug kun `cf-connecting-ip`, hvis Vercel *kun* kan nås gennem Cloudflare. | |
| `TRUSTED_PROXIES` | `1` | |
| `BLOB_READ_WRITE_TOKEN` | sættes af Vercel, når Blob-lageret forbindes (punkt 3) | ja |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | fra Stripe (test-nøgler, indtil I går live) | ja |
| `PROMOTIONS_TEST_MODE` | `1` gør fremhævning af annoncer gratis og øjeblikkelig, når Stripe ikke er sat op. Kun til test – fjern den, når Stripe er klar. | |

3. Tilknyt domænet. HSTS med `preload` sendes automatisk i produktion. Indsend først domænet til hstspreload.org, når alle subdomæner kører https.
4. Slå **Deployment Protection** til for previews, og afgræns hvem der kan se miljøvariabler.

**Stripe-webhook:** opret ét endpoint `https://<domæne>/api/webhooks/stripe/` med disse events: `payment_intent.succeeded`, `payment_intent.canceled` (ordrer) og `checkout.session.completed` (køb af fremhævning). Kopiér signeringshemmeligheden til `STRIPE_WEBHOOK_SECRET`.

Forkert eller manglende konfiguration stopper serveren ved første forespørgsel med en kort fejl uden hemmeligheder (zod-validering i `apps/web/lib/auth.ts`).

## 5. Migrationer (GitHub Actions)

Migrationer køres aldrig automatisk ved deploy, men bevidst med et klik:

1. GitHub → Settings → Environments → opret **`production`**. Kræv godkendelse (*Required reviewers*), og tilføj secret **`DATABASE_URL_MIGRATE`**: ejer-brugerens **direkte** URL (uden `-pooler`).
2. Actions → **Databasemigrering** → *Run workflow*. Den kører `npm run migrate -w @respin/db`, og en ekstra kørsel uden nye migrationer ændrer intet.

Rækkefølgen ved en ny version, der kræver skemaændringer: kør migrationen først og deploy derefter. Skriv derfor migrationer, så den gamle version stadig virker imens: tilføj kolonner før koden bruger dem, og fjern dem først i en senere version.

## 6. Tjek efter første deploy

```bash
curl -sI https://videro.dk/ | grep -iE 'content-security|strict-transport|x-frame|x-content-type|referrer|permissions'
```

```bash
curl -s https://videro.dk/api/health/
```

- Health skal svare `{"ok":true}`.
- `https://videro.dk/konto/` skal sende dig videre til `/log-ind/?next=%2Fkonto%2F`.
- Opret en konto, bekræft mailen og log ind. Tilføj en passkey og slå to-trins-login til under *Login og sikkerhed*.
- Gå [go-live-checklisten i 02-security.md](02-security.md#11-go-live-checkliste-alle-skal-være-afkrydset) igennem.

## 7. Admin-panelet (medarbejdere)

Admin er en selvstændig app (`apps/admin`) på sit eget domæne, fx `admin.videro.dk`. Den må aldrig kunne nås uden om Cloudflare Access.

1. **Domæne og Cloudflare Access:** læg domænet bag Cloudflare, og opret en Access-applikation for `admin.videro.dk` med jeres arbejdsmails og MFA. Notér *team domain* og *AUD*.
2. **Vercel:** opret et nyt projekt fra samme repo med **Root Directory = `apps/admin`**. Miljøvariabler (kun *Production*):

| Variabel | Værdi |
|---|---|
| `DATABASE_URL` | Neon pooler-URL for en login-bruger med rollen `respin_admin` (`CREATE USER respin_admin_app LOGIN PASSWORD '…' IN ROLE respin_admin;`) |
| `ACCESS_TEAM_DOMAIN`, `ACCESS_AUD` | fra Cloudflare Access |
| `ADMIN_ALLOWED_HOSTS` | `admin.videro.dk` |
| `ADMIN_IP_ALLOWLIST` | kontorets/VPN'ens IP-adresser (eller `ADMIN_IP_ALLOWLIST_DISABLED=true`, hvis I kun bruger Access) |

3. **Medarbejdere:** opret dem i Neons SQL-editor. Rollen afgør, hvad de må: `support` (kundeservice), `moderator` (+ moderation og spærring), `finance` (+ refundering og godkendelser), `admin` (alt).

```sql
INSERT INTO staff_users (email, role, display_name) VALUES ('signe@videro.dk', 'admin', 'Signe');
```

Kunden ser kun medarbejderens fornavn (`display_name`), aldrig e-mailen. Spær en medarbejder med `UPDATE staff_users SET active = false WHERE email = '…'`. Adgangen ophører med det samme.

**Fire-øjne:** refunderinger og tvistafgørelser fra 1.000 kr. skal godkendes af en anden medarbejder med samme rettighed. Databasen afviser, at nogen godkender sin egen anmodning.
