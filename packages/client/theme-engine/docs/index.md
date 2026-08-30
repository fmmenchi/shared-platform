---
title: '@fmmenchi/theme-engine'
---

# @fmmenchi/theme-engine

Builds a **theme** from a handful of colours, and emits it in the shapes different tooling reads.
Where [`@fmmenchi/tokens`](../tokens/index.md) says what a theme must SATISFY, this says how one is
ARRIVED AT — the difference between checking a theme and building one.

Designed in ADR-0033.

## Install

```bash
pnpm add @fmmenchi/theme-engine
```

Published because [`@fmmenchi/nx-theme-generator`](../../plugins/nx-theme-generator/index.md) runs in
your repository and declares its dependencies rather than bundling them. Most people never import
it directly: they run the generator.

## What it is for

A brand arrives as a few colours. A theme is 84 semantic roles across as many schemes as the design
system defines. Writing the second by hand is 84 decisions per scheme, most of them mechanical and
one of them wrong in a way nobody notices until a button is unreadable on hover.

So the engine derives, and the derivation is a **proposal**: every rung of the palette can be
rewritten, and every role can be pointed somewhere else. What it will not do is guess quietly — a
constraint it cannot satisfy is reported, never approximated.

## The three nouns

- **`DesignSystem`** — the shape of a palette, as data: which rungs exist, where they sit, and what
  the grey scale is. Read out of the installed stylesheets by `describeSystem()`, never authored, so
  a consumer whose ramp differs from ours gets their own rungs rather than ours substituted.
- **`ThemeSpec`** — what a theme asks for: the brand colours, the rungs written by hand, the roles
  pinned by hand. It is also, unchanged, the theme builder's editable form.
- **The resolved theme** — every role placed, each one carrying whether it was chosen, solved or
  pinned, and what was measured to justify it. A preset you cannot interrogate is one you cannot
  maintain.

## What it does not do

- **It does not depend on a styling library.** Emitting a Tailwind bridge or a DTCG file is fine;
  importing styled-components to build a theme object is not, and would make a shared layer depend
  on a consumer's framework.
- **It does not restate the contract.** Contrast floors come from `CONTRAST_PAIRS`, roles from
  `COLOR_ROLES`, the rungs from the stylesheets. A second copy of any of them is how a gate goes
  green on the wrong number.
- **It does not own the verdict.** `validateTheme()` lives in `@fmmenchi/tokens` and the engine calls
  it, so a theme that passes here cannot fail your pipeline for a reason this one never mentioned.
