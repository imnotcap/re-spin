# React Bits-komponenter

Kopieret uændret (bortset fra kilde-header) fra [React Bits](https://github.com/DavidHDev/react-bits), `src/ts-tailwind/`.

**Licens:** MIT + Commons Clause (se `LICENSE.md`). Må bruges som del af en hjemmeside/app – også kommercielt – men komponenterne må ikke sælges eller redistribueres for sig selv. Filerne her er **ikke** omfattet af repoets AGPL-licens. Repoet er offentligt – få en jurist til at bekræfte, at kombinationen passer til jeres licensvalg.

Kun komponenter uden GSAP/WebGL er valgt (afhænger kun af `motion` og React):

| Komponent | Bruges i | Indlæses |
|---|---|---|
| `RotatingText` | forsidens hero ("Find brugt …") | når browseren er ledig (`requestIdleCallback`) |
| `CountUp` | nøgletal | når man scroller hen til dem |
| `BlurText` | undertekst i afslutnings-boksen | når man scroller hen til den |
| `SpotlightCard` | funktionskort | med siden (lille, ingen animation før hover) |

De tre første hentes via `components/LazyBits.tsx`: indtil koden er hentet, vises den endelige tekst som almindelig HTML (virker uden JS, intet layout-hop). Ved *reducer bevægelse* hentes de slet ikke.
