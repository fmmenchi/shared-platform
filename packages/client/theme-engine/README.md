# @fmmenchi/theme-engine

Builds a **theme** from a handful of colours, and emits it in the shapes different tooling reads.

Where [`@fmmenchi/tokens`](../tokens/README.md) says what a theme must **satisfy**, this says how one
is **arrived at** — the difference between checking a theme and building one. It imports the contract
and never restates it: contrast floors come from `CONTRAST_PAIRS`, roles from `COLOR_ROLES`, and the
rung table is read out of the installed stylesheets.

```bash
pnpm add @fmmenchi/theme-engine
```

Most people never import it directly — they run `@fmmenchi/nx-theme-generator`, which does.

## What it holds

- **`describeSystem()`** — reads a `DesignSystem` out of the stylesheets a consumer has installed, so
  a ramp that differs from ours is the input rather than a hazard.
- **`FAMILY_CONSTRAINTS`** — what each role must clear, and how it is placed: a fill is anchored to
  the brand's lightness, an ink is chosen between the two neutrals, a state is a fixed distance, a
  wash is searched for.
- **`ThemeSpec`** — what a person asks for, and unchanged the theme builder's editable form.

`buildPreset()` and the per-framework emitters are next. Design and reasoning:
ADR-0033 in the docs site.

Agent-facing notes: [AGENTS.md](./AGENTS.md).
