# Juridisk gennemgang af Videro (november 2026)

> Gennemgangen er lavet af Claude (AI) og er ikke juridisk rådgivning. Den skal bruges som grundlag for en
> gennemgang hos en dansk advokat med erfaring i e-handel, betaling og skat **før** Videro åbner for rigtige handler.
> Punkter markeret **Bekræft** bygger på kilder, der ikke er endeligt verificeret.

## 1. Konklusion

Vilkår, privatlivspolitik og købsflow dækker nu de krav, der er fundet herunder. Videro kan dog **ikke lanceres
lovligt**, før disse ting er på plads:

1. **Virksomhed og kontaktoplysninger:** selskab, CVR, adresse og e-mail skal udfyldes i `LEGAL_ENTITY` i
   `apps/web/lib/site.ts`. Det kræves af e-handelsloven § 7, DSA art. 11-12 og GDPR art. 13. Oplysningerne vises
   derefter automatisk i vilkår, privatlivspolitik og footer.
2. **Stripe Connect-aftale:** en aftale med Stripe for EU-markedspladsen, hvor Stripe skriftligt bekræfter, at den
   valgte pengestrøm og tilbageholdelsestiden er tilladt (afsnit 3).
3. **Registreringer:**
   - Momsregistrering, fordi køberbeskyttelse og fremhævning er momspligtige ydelser.
   - Registrering som platformsoperatør til DAC7 hos Skattestyrelsen.
   - Indsamling og indberetning af sælgeroplysninger efter DAC7 (afsnit 4).
4. **Databehandleraftaler** med Vercel, Neon, Cloudflare og Resend. Udfyld også fortegnelsen efter GDPR art. 30.
5. **Advokatgennemgang** af vilkår og privatlivspolitik. Fjern derefter "Testversion"-boksen ved at sætte
   `draft={false}` i `LegalPage`.

## 2. Videros juridiske model

Videro er en **onlinemarkedsplads for private (C2C)**. Videro er ikke sælger og ejer ikke varerne. Indtægterne
kommer fra køberbeskyttelse (5 % + 3 kr., betalt af køber) og fremhævning. Sælgere betaler 0 % i kommission.
Modellen svarer til Vinteds.

Konsekvenser af modellen:

- **Mellem køber og privat sælger** gælder aftaleloven og købeloven, men ikke forbrugerkøbsloven eller
  fortrydelsesretten. Det skal køberen have at vide før købet. Det står nu i købsvinduet og i vilkårenes afsnit 2.
- **Mellem Videro og brugeren** er brugeren forbruger, når vedkommende betaler køberbeskyttelse og fremhævning. Der
  gælder forbrugeraftaleloven, markedsføringsloven og prisreglerne.
- **Kun private sælgere:** Videro tillader kun private sælgere. Det holder Videro uden for de tunge krav om
  sporbarhed af erhvervsdrivende (DSA art. 30-32) og uden for forbrugerrettighederne mellem køber og
  erhvervssælger. Hvis I senere vil åbne for "Pro"-sælgere, skal markedsføringsloven § 6, stk. 2, nr. 7 og DSA art.
  30 håndteres først.

## 3. Penge: Stripe Connect, tilbageholdelse og frysning

**Hvem holder pengene?** En markedsplads, der selv modtager og opbevarer købers penge, kan blive en
betalingstjeneste, der kræver tilladelse efter betalingsloven (PSD2). Derfor skal pengene holdes af en
licenseret aktør:

- **Videro:** bruger Stripe Connect med "separate charges and transfers". Køberen betaler til Videros
  Stripe-konto, og når handlen er gennemført, overføres beløbet til sælgerens tilsluttede Stripe-konto
  (`createTransfer` med `sourceTransaction` i `packages/payments`). Pengene ligger hos Stripe, som er licenseret.
  Videro rører dem aldrig.
- **Vinted:** har ifølge rapporter fra oktober 2026 flyttet europæiske saldi fra Mangopay til sin egen
  licenserede enhed, **Vinted Pay UAB** (Litauen). Brugerne skal acceptere særskilte Vinted Pay-vilkår.

**Det skal bekræftes med Stripe:**

- **Bekræft:** at "separate charges and transfers" med tilbageholdelse, til køberen har godkendt, er tilladt for
  en dansk platform. Stripes dokumentation siger, at mønsteret bruges, når man skal "hold funds". Spørg også om den
  maksimale periode, pengene må stå på platformssaldoen, før de overføres.
- **Bekræft:** hvem der er "merchant of record". Uden `on_behalf_of` er platformen det som udgangspunkt. Det har
  betydning for moms, kvitteringer og kortindsigelser (chargebacks).
- **Sælgerens aftale med Stripe:** sælgeren skal acceptere Stripe Connected Account Agreement. Videros vilkår
  skal forklare platformens ydelser og hvordan kontodata bruges. Begge dele står nu i afsnit 7.
- **Kontotype:** ved Express/Custom-konti hæfter platformen typisk for negative saldi, fx ved chargebacks. Det skal
  indgå i økonomien.

**Frysning af penge og konti** er lovligt, når det har hjemmel i vilkårene og er sagligt begrundet. Vinted
fryser fx konti ved KYC- og DAC7-krav. Forbruger Europa har fået mange klager over spærrede konti uden klar
begrundelse. Videros vilkår (afsnit 7-10) begrænser derfor tilbageholdelse til konkrete grunde:

- åben klage fra køberen
- begrundet mistanke om svindel eller hvidvask
- chargeback
- krav fra Stripe
- manglende identitets- eller skatteoplysninger

Brugeren får desuden en skriftlig begrundelse (DSA art. 17 omfatter udtrykkeligt begrænsning af pengeoverførsler)
og en klageadgang med menneskelig behandling.

**Hvidvask:** Stripe står for KYC efter hvidvaskloven. Videro er ikke selvstændigt omfattet, så længe Videro ikke
selv udfører betalingstjenester. **Bekræft** med advokaten.

## 4. Skat

### DAC7 (BEK nr. 1253 af 06/09/2022)

- Videro er en "indberettende platformsoperatør".
- **Grænsen:** sælgere med færre end 30 salg **og** højst 2.000 euro i vederlag om året er undtaget. Alle andre
  skal indberettes.
- **Tidsfrister:**
  - Indberetning sker senest 31. januar for det foregående kalenderår.
  - Sælgeren skal underrettes, før der indberettes.
  - Due diligence (kendskab til sælgeren) skal gentages mindst hvert 36. måned.
- **Oplysninger der skal indsamles:**
  - navn og adresse
  - fødselsdato
  - skatte-ID (CPR)
  - bankkonto
  - antal salg og vederlag pr. kvartal
  - gebyrer
- **Manglende oplysninger:** reglerne kræver, at platformen tilbageholder vederlaget eller lukker kontoen efter to
  påmindelser. Det står i vilkårenes afsnit 8.
- **Mangler i koden:**
  - en tæller for salg og beløb pr. sælger
  - en formular til skatteoplysninger
  - kryptering af CPR, der er fortroligt efter databeskyttelsesloven § 11
  - en indberetningsfil i Skattestyrelsens DAC7-format
  - registrering hos Skattestyrelsen

### Sælgernes egen skat

Salg af egne brugte ting er som udgangspunkt skattefrit. Det bliver skattepligtigt, hvis man sælger regelmæssigt,
køber med henblik på videresalg eller driver erhverv. Det står nu i vilkårene som oplysning; ansvaret er sælgerens.

### Videros moms

Køberbeskyttelse og fremhævning er momspligtige ydelser (25 %). Priser over for forbrugere skal vises inkl. moms,
og det står nu udtrykkeligt i vilkårene. Videro skal momsregistreres, før omsætningen passerer 50.000 kr.

**Bekræft:** om køberbeskyttelsen faktureres som en ydelse fra Videro (som hos Vinted, der i oktober 2026 efter
rapporterne har omdøbt den til "Vinted fee") og ikke som forsikring. En egentlig forsikring ville kræve tilladelse
som forsikringsformidler. Teksten siger nu udtrykkeligt "en ydelse fra Videro (ikke en forsikring)".

## 5. Forbrugerret og markedsføring

| Krav | Kilde | Status |
|---|---|---|
| Samlet pris inkl. alle gebyrer vises før køb og ikke først i kurven ("drip pricing") | Markedsføringsloven, prismærkning; EU's CPC-aktion mod Vinted 2024 | ✅ Varekort og annonce viser "inkl. køberbeskyttelse"; købsvinduet viser alle linjer |
| Oplysning om, at sælger er privat, og at forbrugerrettigheder ikke gælder | Markedsføringsloven § 6, stk. 2, nr. 7 | ✅ Tilføjet i købsvinduet (5 sprog) og vilkårenes afsnit 2 |
| Rangering: hovedparametre for sortering | Markedsføringsloven § 6 a | ✅ Nyt afsnit 11 i vilkårene |
| Betalt placering skal være tydelig | Markedsføringsloven, skjult reklame | ✅ Mærket «Fremhævet» på annoncer og sælgere |
| Anmeldelser: hvordan de verificeres | Markedsføringsloven § 6 b | ✅ Afsnit 12. ⚠️ Anmeldelsesfunktionen er ikke bygget endnu; den skal følge reglen (kun efter betalt handel) |
| Fortrydelsesret ved fremhævning (tjenesteydelse leveret straks) | Forbrugeraftaleloven § 18, stk. 2, nr. 1 | ✅ Påkrævet afkrydsning før betaling, valideret på serveren |
| Klageadgang (Center for Klageløsning) | Forbrugerklageloven | ✅ Afsnit 10. EU's ODR-platform er nedlagt og nævnes ikke |
| Virksomhedsoplysninger | E-handelsloven § 7 | ⚠️ Skal udfyldes i `LEGAL_ENTITY` |
| Accept af vilkår og 18 år ved oprettelse | Aftaleretten; Stripe kræver 18+ for udbetaling | ✅ Påkrævet afkrydsning, valideret på serveren |

## 6. Forordningen om digitale tjenester (DSA)

Som mikro- eller lille virksomhed (under 50 ansatte og 10 mio. euro i omsætning) er Videro **undtaget** fra en
række krav:

- art. 20-28: intern klageordning, udenretslig tvistbilæggelse, gennemsigtighedsrapporter m.m.
- art. 30-32: sporbarhed af erhvervsdrivende

Undtagelsen gælder **ikke** for:

| Artikel | Krav | Status |
|---|---|---|
| Art. 11-12 | Kontaktpunkt for myndigheder og brugere | ⚠️ E-mail skal udfyldes |
| Art. 14 | Vilkår skal beskrive begrænsninger, moderation og automatiske værktøjer | ✅ Afsnit 9 |
| Art. 16 | Mekanisme, hvor **alle** kan anmelde ulovligt indhold | ✅ Knappen «Anmeld» for brugere og e-mail for alle andre. ⚠️ Anmeldelser uden konto kræver, at e-mailen er udfyldt. Overvej en formular uden login |
| Art. 17 | Begrundelse ved fjernelse, spærring og tilbageholdelse af penge | ✅ Beskrevet i afsnit 7 og 9. Admin gemmer en note ved moderation, og den vises for sælgeren |
| Art. 18 | Underretning af politiet ved mistanke om alvorlig kriminalitet | Intern procedure mangler |

En intern klageadgang (art. 20) er alligevel beskrevet i afsnit 10, fordi den mindsker risikoen for tvister om
frosne penge.

## 7. Persondata (GDPR) og cookies

- **Privatlivspolitikken er udvidet med:**
  - beskeder og bud
  - automatisk scanning for svindel
  - notifikationer
  - betaling og KYC hos Stripe
  - DAC7-oplysninger, herunder CPR (databeskyttelseslovens § 11)
  - moderation
  - navngivne databehandlere og overførsler til USA
- **Stripe** er selvstændig dataansvarlig for KYC og forebyggelse af svindel.
- **Opbevaringsfrister i politikken, der skal bygges som automatiske sletjob:**
  - beskeder: højst 3 år efter seneste besked
  - advarsler: 2 år efter, at kontoen er lukket
- **Cookies:** Videro bruger kun nødvendige cookies og cookiefri statistik. Det er i orden efter
  cookiebekendtgørelsen.
- **Mangler:** fortegnelse (art. 30), databehandleraftaler og en konsekvensanalyse (DPIA) for den automatiske
  scanning af beskeder. Den sidste er **anbefalet**, ikke nødvendigvis påkrævet.

## 8. Andet

- **Tilgængelighed (EAA, lov om tilgængelighedskrav for produkter og tjenester):** e-handelstjenester er omfattet,
  men mikrovirksomheder (under 10 ansatte og højst 2 mio. euro i omsætning) er undtaget. Siden er allerede bygget
  til WCAG AA.
- **Varemærke:** tjek, at "Videro" ikke krænker et registreret varemærke i klasse 35 og 42. Søg hos DKPTO og EUIPO.
- **Forbudte varer:** listen er udvidet i vilkårenes afsnit 4 med bl.a. kopivarer, tilbagekaldte produkter, åbnet
  kosmetik, alkohol og tobak.

## 9. Ændringer lavet i koden

- `apps/web/app/vilkaar/page.tsx`: vilkårene er omskrevet til 15 afsnit.
- `apps/web/app/privatliv/page.tsx`: nye behandlinger, retsgrundlag, databehandlere og opbevaring.
- `apps/web/lib/site.ts`: `LEGAL_ENTITY`, ét sted at udfylde virksomhedsoplysninger. De vises i vilkår,
  privatlivspolitik og footer.
- Oprettelse kræver afkrydsning af "fyldt 18 år og accepterer vilkårene", valideret på serveren.
- Fremhævning kræver udtrykkeligt samtykke til, at fortrydelsesretten bortfalder, valideret på serveren.
- Købsvinduet viser, at køberen køber af en privatperson (5 sprog).

## Kilder

- [Skattestyrelsen: Q&A om DAC7](https://skat.dk/erhverv/ekapital/platformsoekonomi/qa-om-dac7) og [registrering til DAC7](https://skat.dk/erhverv/ekapital/platformsoekonomi/registrering-til-dac7)
- [Stripe Connected Account Agreement](https://stripe.com/connect/account-terms) og [Stripe: charges i Connect](https://docs.stripe.com/connect/charges)
- [EU-forbrugermyndighederne (ACM): Vinted skal være tydeligere om priser](https://acm.nl/en/publications/eu-consumer-authorities-compel-vinted-be-clearer-about-prices-and-conditions) og [ICPEN om Vinted-dialogen](https://icpen.org/news/1364)
- [Vinted Europe: vilkårsændring oktober 2026 (Vinted Pay, "Vinted fee")](https://valueaddedresource.net/vinted-europe-terms-october-2026/)
- [Vinted Pay vilkår (dansk)](https://vintedpay.com/pdf/lt/da-DK/Vinted_Pay-Terms_and_Conditions.pdf)
- [Lovguiden / Forbruger Europa: Handler du på Vinted?](https://lovguiden.dk/det-offentlige/forbruger-europa/2025-07-07-handler-du-paa-vinted-det-skal-du-vaere-opmaerksom-paa)
- [Markedsføringsloven § 6 a](https://danskelove.dk/markedsf%C3%B8ringsloven/6a) og [lov nr. 2192 af 30/11/2021](https://www.lovguiden.dk/loven/lov-nr-2192-af-30-11-2021)
- [DSA art. 19 (undtagelse for mikro- og små virksomheder)](https://www.springlex.eu/en/packages/dsa/dsa-regulation/article-19/)
- [BDO: hvornår privat salg bliver skatte- og momspligtigt](https://www.bdo.dk/da-dk/faglig-info/depechen/depechen-artikler-2021/mobilepay-betalinger-udloeste-en-regning-for-baade-skat-og-moms)
