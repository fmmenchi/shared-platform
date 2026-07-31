# ADR 0011 — DS css ships in a cascade layer; consumers override unlayered

- **Status:** superseded by [ADR-0018](./0018-how-the-ds-ships-css.md) (2026-07-30) — was: accepted (2026-07-28)
- **Date:** 2026-07-28
- **Deciders:** Fabio Menchicchi

> **Superseded.** This decision now lives in [ADR-0018 — How the design system ships CSS](./0018-how-the-ds-ships-css.md),
> which consolidates it with the decisions it belonged with. The text below is kept unchanged as the
> record of what was decided and why; read 0018 for what is in force.

## Context and problem statement

The DS ships **precompiled CSS** (`@fmmenchi/ui/style.css` + per-component subpaths) that a consumer
imports as-is — no Tailwind, no source scan on their side. So the only lever a consumer has to
adjust a component's look is to write css that beats ours. Today that means **winning a specificity
war**: our rules are `.className { … }` (specificity 0-1-0), so a consumer override has to match or
exceed it and hope our selectors never get more specific — the classic escalation that ends in
`!important`. With Input, Dialog, and the rest of the roadmap about to multiply the surface, the
override contract has to be settled now, before N components bake in the wrong one.

`@layer` (cascade layers) is Baseline Widely (~2022) and is the platform's answer: **any unlayered
declaration beats any layered one, regardless of specificity.** It is the canonical way a design
system makes itself overridable by default.

## Decision

**Every DS component rule ships inside a single named cascade layer, `fmmenchi`. Tokens stay
unlayered.**

- **Components → `@layer fmmenchi { … }`.** Each `*.module.css` wraps all of its rules (including its
  `@media` blocks) in the layer. `@import` and `@reference` stay above it (they must precede any
  style rule); `@keyframes` stay unlayered (name-scoped — they don't take part in the property
  cascade). The generator template opens the layer, so the archetype propagates it to every future
  component.
- **Tokens stay UNLAYERED.** `vars.css` `:root { --fm-* }` is the substrate every layer resolves
  `var()` against; custom-property definitions are deliberately kept out of any layer so they are
  always in scope and a consumer can reassign a `--fm-*` role from anywhere.
- **The consumer contract:** because unlayered wins, a consuming app overrides any DS rule with a
  plain rule — no matching our specificity, no `!important`. An app that itself uses layers can order
  ours explicitly with a one-line `@layer fmmenchi, app;` statement before importing our css (later
  layers win); an app with no layers needs to do nothing — its ordinary css already wins.
- **One flat layer, for now.** Only component rules exist, and they target disjoint class names, so
  intra-DS ordering is moot. If a base/reset or DS-authored utilities layer is ever needed, it lands
  as nested sublayers (`@layer fmmenchi { @layer base, components; }`) — an internal reordering that
  does not change the consumer-facing `fmmenchi` boundary.

## Consequences

- Overriding a component is a plain rule again — the DS is themable via tokens **and** patchable via
  css, without specificity escalation. This is the property that lets the DS stay strict internally
  (single class selectors) without boxing consumers in.
- The precompiled `dist/*.css` gains one `@layer fmmenchi{ … }` wrapper; verified in the build
  output. No runtime cost, no bundle growth beyond the wrapper.
- `@layer` is Baseline Widely, so this is a plain adoption under ADR-0003 — not a progressive
  enhancement, no ADR-0010 exception. (Note: Tailwind v4 already emits its own internal `@layer`
  and `@property` in our output — the platform floor is comfortably past both.)
- Enforced by the generator spec (template must open `@layer fmmenchi`) so no future component is
  born unlayered.
