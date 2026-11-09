# Opsætning af Stripe (betaling, udbetaling og ID-kontrol)

Videro bruger **Stripe Connect** med *separate charges and transfers*:

1. Køberen betaler på Stripes betalingsside (Checkout) med kort eller MobilePay. Pengene lander på Videros
   Stripe-konto, så de ligger hos Stripe og aldrig hos Videro.
2. Sælgeren opretter en udbetalingskonto (Express, aftaletypen "recipient"). **Stripe står for ID-kontrollen
   (KYC)**: navn, fødselsdato, adresse, bankkonto og ved behov legitimation og selfie.
3. Når køberen har godkendt varen, eller 48 timer efter levering, overfører Videro sælgerens beløb til
   sælgerens Stripe-konto. Stripe udbetaler derefter til sælgerens bank.

Uden Stripe-nøgler kører siden i testtilstand. Lokalt simuleres betaling og godkendelse af udbetalingskonto.
I produktion er køb og fremhævning slået fra, indtil nøglerne er sat.

## 1. Stripe-konto og Connect

1. Opret en konto på stripe.com og vælg Danmark og jeres virksomhed (CVR).
2. **Connect → Get started:** vælg *Marketplace* og kontotypen **Express**.
3. **Connect → Settings:**
   - Branding: navn "Videro", logo og farve `#0F5C34`.
   - Platform profile: sælgere er privatpersoner, der sælger brugte ting. Pengestrømmen er "separate charges
     and transfers", og Videro holder pengene, til køberen har godkendt varen (højst ca. 14 dage).
   - Bed Stripe bekræfte skriftligt, at tilbageholdelsen og aftaletypen "recipient" er godkendt for jer. Se den
     juridiske gennemgang i `docs/legal/juridisk-gennemgang.md`, afsnit 3.
4. **Settings → Payment methods:** slå Kort og MobilePay til.

## 2. Nøgler i Vercel (projektet re-spin, Production)

| Variabel | Hvor findes den | Note |
|---|---|---|
| `STRIPE_SECRET_KEY` | Developers → API keys → Secret key | Brug gerne en *restricted key*. Start med `sk_test_…` og test alt, før I skifter til `sk_live_…` |
| `STRIPE_WEBHOOK_SECRET` | Webhook-endpoint 1 (se nedenfor) → Signing secret | `whsec_…` |
| `STRIPE_CONNECT_WEBHOOK_SECRET` | Webhook-endpoint 2 (Connect) → Signing secret | `whsec_…` |

Marker variablerne som *Sensitive*, og redeploy bagefter.

## 3. Webhooks (Developers → Webhooks)

Opret to endpoints med samme adresse: `https://videro.dk/api/webhooks/stripe/`

**Endpoint 1, "Your account".** Events:

- `checkout.session.completed`
- `checkout.session.async_payment_succeeded`
- `checkout.session.expired`
- `payment_intent.succeeded`
- `payment_intent.canceled`

**Endpoint 2, "Connected accounts".** Events:

- `account.updated`, så sælgerens ID-kontrolstatus opdateres med det samme.

Siden henter også status direkte fra Stripe, når sælgeren kommer tilbage fra Stripes side.

## 4. Database og job

- **Migration 0012** (`packages/db/migrations/0012_stripe_connect.sql`) skal køres på produktion. Den tilføjer
  ordrens betalingssession, leveringsadresse, sporing og sælgerens Stripe-status samt rettigheder.
- **Hvert 5. minut** kalder GitHub Actions-workflowen "notifikationer" `/api/cron/notifikationer/`. Den kører:
  - ordrernes frister (ubetalt efter 30 min., ikke sendt efter 5 dage, antaget leveret efter 10 dage,
    automatisk godkendelse efter 48 timer)
  - udbetalinger og refunderinger hos Stripe
  - ordremails og mails om beskeder

  Kræver repository-secret `CRON_SECRET`.

## 5. Test i testtilstand, før I går live

- **Køb:** brug testkortet `4242 4242 4242 4242` med en vilkårlig fremtidig dato og CVC.
- **Udbetalingskonto:** Stripe viser testværdier på onboarding-siden. Brug fx `000 000 0000` som telefonkode og
  `DK5000400440116243` som IBAN. Se Stripes dokumentation "Testing Connect".
- **Hele forløbet:**
  1. Køb en vare.
  2. Sælgeren markerer varen som sendt.
  3. Køberen trykker "modtaget" og derefter "godkend".
  4. Kør cron-ruten og tjek, at overførslen er sket i Stripe-dashboardet under Connect → Transfers.

## Bevidste begrænsninger (næste skridt)

- **Fragtlabels og sporing:** der er ingen integration med PostNord, GLS eller DAO endnu. Sælgeren angiver selv
  sporingsnummer, køberen bekræfter modtagelse, og ellers regnes pakken for leveret efter 10 dage.
- **DAC7:** indsamling af skatteoplysninger og indberetningsfil er ikke bygget. Se `docs/legal/juridisk-gennemgang.md`.
