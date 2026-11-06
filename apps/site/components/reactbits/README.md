# React Bits-komponenter

Kopieret uændret (bortset fra kilde-header) fra [React Bits](https://github.com/DavidHDev/react-bits), `src/ts-tailwind/`.

**Licens:** MIT + Commons Clause (se `LICENSE.md`). Må bruges som del af en hjemmeside/app – også kommercielt – men komponenterne må ikke sælges eller redistribueres for sig selv. Filerne her er **ikke** omfattet af repoets AGPL-licens. Repoet er offentligt – få en jurist til at bekræfte, at kombinationen passer til jeres licensvalg.

Kun `RotatingText` bruges (det skiftende ord i forsidens banner). Den afhænger kun af `motion` og React og hentes via `components/LazyBits.tsx`, når browseren er ledig. Indtil da vises det første ord som almindelig HTML (virker uden JS, intet layout-hop). Ved *reducer bevægelse* hentes den slet ikke.
