# AGENTS.md — @fmmenchi/theme-engine

Builds a theme from a handful of colours, and emits it in the shapes different tooling reads.
Part of `shared-platform`; workspace contract in [../../../AGENTS.md](../../../AGENTS.md).
Scope `client`, type `util`. Designed in [ADR-0033](../../../apps/docusaurus/docs/adr/0033-theme-builder-gui.md).

## Commands

```bash
pnpm nx typecheck @fmmenchi/theme-engine
pnpm nx build @fmmenchi/theme-engine
pnpm nx lint @fmmenchi/theme-engine
pnpm nx test @fmmenchi/theme-engine
```

## Why it is not inside `@fmmenchi/tokens`

Consuming tokens is a LIBRARY; building a theme is a TOOL that runs once and ships nothing to
anybody's browser. Keeping them apart was decided on three grounds, and the deciding fact was that
this package needs **nothing new exported** from the contract — everything it consumes is already a
public subpath (`.`, `./validate`, `./resolve`, `./read-vars`).

- **ADR-0033 does not require cohabitation.** Its rule is that `validateTheme()` is the only place
  the verdict lives, and that holds by IMPORTING it. The builder and CI still ask one question.
- **Blast radius.** `@fmmenchi/tokens` calls itself the most delicate package of the platform: it
  defines the allowed themes. A solver growing inside it widens the reach of every change to the
  piece that can least afford one.
- **Cadence.** The contract is stable by construction; a solver changes whenever a heuristic is
  tuned. Together, the first is versioned at the speed of the second.

## Rules

- **It is published because the Nx generator is.** `@fmmenchi/nx-theme-generator` runs in a
  CONSUMER's repository and DECLARES its dependencies rather than bundling them — it ships only
  `dist` — so a private engine would fail to resolve on their install. That is the whole reason,
  and if the generator ever bundles instead, this can go private again.
- **Emit artifacts; never depend on a styling library.** A generated `.css`, a Tailwind bridge, a
  DTCG `.json` are all fine. Importing styled-components or Panda to produce a theme object is not:
  it would make a shared layer depend on a consumer's framework, which the workspace forbids
  outright. The same rule `@fmmenchi/tokens` states for its own two shapes.
- **`buildPreset()` returns the resolved THEME, not CSS.** Each binding is a separate function over
  that value, sharing one solve. There is more than one reader, and that is the point.
- **The contract is imported, never restated.** Floors come from `CONTRAST_PAIRS`, roles from
  `COLOR_ROLES`, and the rung table from `describeSystem()` reading the installed stylesheets. A
  second copy of any of them is how a gate goes green on the wrong number.
- **Types in a separate `<name>.types.ts`, `index.ts` a barrel.** As everywhere here. And beside
  their user, not in a folder of their own — the workspace rule is a separate FILE.

`CLAUDE.md` is a symlink to this file — edit `AGENTS.md` only.
