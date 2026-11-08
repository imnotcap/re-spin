# Videro – brand

Videro er en dansk markedsplads for brugt tøj, sko og boligting. Navnet kommer af *videre*: **giv det videre**.

## Navn og slagord

- Navnet skrives **Videro** i løbende tekst og **videro** (små bogstaver) i selve logoet.
- Slagord: **Giv det videre.**
- Domæne: `videro.dk`. Profiladresser: `videro.dk/@profilnavn`.

## Logo

Mærket er ét sammenhængende strøg: V'ets højre ben fortsætter op og bliver til en cirkelpil (genbrug), som ender lige før V'ets venstre ben. Navnet og kredsløbet er ét tegn.

- Koden: `packages/ui/src/icons/Logo.tsx` (`LogoMark`, `Wordmark`). Favicon: `apps/web/app/icon.svg`.
- Tegnet i et 64 × 64-felt med streg 7. Cirklen har radius 24 og midtpunkt (32, 32).
- På lys baggrund: skovgrøn (`#0e5a2f`). På mørk baggrund: lime (`#d2ff32`). Mærket er altid én farve.
- App-ikon og favicon: lime mærke på skovgrøn afrundet flade.
- Ordet sættes i Schibsted Grotesk 800 med bogstavafstand −0,04 em. Mærket er 1,3 × skriftstørrelsen.
- Hold afstand omkring mærket svarende til V'ets højde. Mærket må ikke strækkes, tones, drejes eller deles i to farver.

## Farver

Skovgrøn giver følelsen af genbrug og er sidens grundfarve. Tokennavnene i kittet er uændrede.

| Navn | Token | Hex | Bruges til |
|---|---|---|---|
| Skovgrøn | `--rs-forest` | `#0e5a2f` | Mærke, knapper, links, aktive punkter |
| Lime | `--rs-lime` | `#d2ff32` | Handlingsfarve og mærket på mørk baggrund. Tekst på lime er altid sort, aldrig hvid |
| Koral | `--rs-coral` | `#ff5a5f` | Hjerter, notifikationer |
| Creme | `--rs-cream` | `#fdfbf7` | Sidens baggrund |
| Skifer | `--rs-slate` | `#1c1c1c` | Tekst |

Ingen gradienter i selve siden (`rs-flat`).

## Skrift

**Schibsted Grotesk** (variabel, vægt 400–800), selv-hostet via `next/font` i `apps/web/app/fonts/`. Licens: SIL Open Font License, se `OFL-Schibsted-Grotesk.txt`.

Skriftfilen er et delsæt (latin, inkl. æ, ø, å) på 36 KB. Funktionen `tnum` (tabelfigurer) er rettet, så den kun gælder cifre. I originalen gør den også punktum, komma og kolon brede, og priser blev til "450 kr .". Rettelsen er lavet med fonttools, og samme trin skal gentages, hvis skriften opdateres.

## Tone

- **Konkret**: tal og regler i stedet for løfter ("48 timer til at melde fejl").
- **Varm**: hverdagssprog og du-form.
- **Ærlig**: siger, når noget ikke virker endnu, og hvad det koster.

Eksempler: *Giv det videre.* · *Pengene bliver hos os, til varen er nået frem.* · *Betalingen gik ikke igennem. Der er ikke trukket noget.*

## Det, der ikke er omdøbt

Pakkenavnene (`@respin/…`), databaserollerne (`respin_web` m.fl.), CSS-præfikset `rs-` og repoets navn er interne og usynlige for kunder. De kan omdøbes senere. Cookie- og lagernøglerne hedder nu `__Host-videro_session`, `videro.consent`, `videro:favoritter` og `videro.lang`.
