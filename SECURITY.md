# Sikkerhedspolitik

## Meld en sårbarhed

Opdager du en sikkerhedsfejl i re:spin, så **opret ikke et offentligt issue**. Brug i stedet GitHubs
[private vulnerability reporting](../../security/advisories/new) på dette repo.

Vi bestræber os på at bekræfte modtagelse inden for 3 hverdage og at holde dig opdateret, indtil fejlen er rettet.
Forsøg ikke at tilgå andre brugeres data, forstyrre driften eller teste mod produktion uden aftale.

## Hvad der er i scope

- Kode i dette repo (`apps/*`, `packages/*`)
- Konfigurationseksempler og CI-workflows

## Til udviklere

Se `docs/platform/02-security.md` for trusselsmodel, kontroller og checklister. Kort fortalt:

- Ingen hemmeligheder i git. `.env*` er ignoreret; kun `*.example` committes. Secret-scan kører i CI.
- Alle penge er heltal i øre, og alle pengebevægelser går gennem ordre-tilstandsmaskinen og dobbelt bogholderi.
- Ændringer i `packages/security`, `packages/payments`, `packages/db` og `apps/admin` kræver review (CODEOWNERS).
- Nye afhængigheder skal begrundes; `npm audit` og Dependabot kører automatisk.
