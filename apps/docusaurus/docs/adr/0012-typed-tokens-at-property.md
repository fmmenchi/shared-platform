# ADR 0012 — Semantic tokens are `@property`-typed for interpolation

- **Status:** accepted (2026-07-28)
- **Date:** 2026-07-28
- **Deciders:** Fabio Menchicchi

## Context and problem statement

Token roles ship as plain custom properties (`:root { --fm-color-primary: … }`). Plain custom
properties are **untyped strings** to the browser, which has one consequence that matters for a DS:
**they do not interpolate.** A `[data-theme]` flip snaps every colour instantly; a value driven from
a token cannot be tweened; there is no runtime guard against a malformed assignment.

`@property` fixes this by giving each role a type. It is **Baseline Newly, not Widely** (Firefox
shipped it 2024-07, so Widely lands ~2027-01), which under ADR-0003 would normally forbid it. But it
**degrades perfectly**: without support the roles are just untyped strings — they still hold their
value and every component renders identically; only the interpolation polish is lost. That is the
exact shape ADR-0010 admits, so it ships as a **progressive enhancement**, not a plain adoption.

The reference implementation to learn from (andes-routes) registers every role — and shows the one
technique that makes it safe for a single-source token system: the **`initial-value` is a throwaway
placeholder, not the real token**.

## Decision

**Register the semantic roles with `@property` in a co-located `styles/properties.css`, imported at
the top of `vars.css`. Type only the roles with a real interpolation payoff.**

- **Colours → `syntax: '<color>'`, radius → `syntax: '<length>'`**, all `inherits: true`. This is the
  set that benefits: colours unlock **theme crossfade** (a `transition` on the roles tweens across a
  `data-theme` flip instead of snapping) and gradient/among-token tweens; radius unlocks shape
  animation. Fonts, spacing, duration, shadows stay **unregistered** — no component animates them
  yet, and registering a capability nothing uses is the phantom-contract trap we already avoid.
- **`initial-value` is a sentinel, never the real value.** Colours use `oklch(0 0 0)`; `:root` +
  `inherits: true` always cascade the true token over it, so **single-source is preserved** — the
  type layer duplicates no literal. (This is the crux that makes mass-registration safe.)
- **Radius `initial-value` must be absolute px**, not the real `rem` literals: a non-universal
  `syntax` requires a _computationally independent_ `initial-value`, and `rem`/`em` are font-relative
  — the browser rejects the rule. px equivalents at the 16px root (`rem × 16`) keep the registration
  valid without claiming to be the source of truth.
- **Separate file, one import.** `properties.css` holds the registrations (a registration is a
  side-effect, so it stays out of the values-only `vars.css` body); `vars.css` imports it at the top
  so the tokens and their types are inseparable, and it is also a public subpath
  (`@fmmenchi/tokens/styles/properties.css`). Coverage is asserted against `COLOR_ROLES` +
  `RADIUS_TOKENS` by `tokens.test.ts`, so the type layer cannot drift from the contract, and a test
  pins every colour `initial-value` to the sentinel so a real value can never sneak in.

## Consequences

- The DS can crossfade themes and animate token-driven values — opt-in (the consumer adds the
  `transition`); the registration is the enabler, not a forced behaviour.
- A malformed token assignment now falls back to the sentinel instead of poisoning the cascade. This
  is largely redundant with `validateTheme()` (build-time), and carries a mild risk — an unvalidated
  bad value renders as the sentinel colour rather than failing loudly — which is why consumers are
  told to run `validateTheme()` in their own CI.
- **ADR-0010 progressive enhancement, not a plain adoption:** `@property` is Baseline Newly (Widely
  ~2027-01) and degrades to untyped custom properties, so it ships behind a single justified,
  file-level `eslint-disable css/use-baseline` comment in `properties.css` and is recorded in the
  [Known issues ledger](../known-issues.md) — the entry (and the disable) retire when it goes Widely.
  Supersedes the "no `@property`" clause of the original token doctrine.
- Scope is deliberately narrow (colour + radius). Extending to spacing/duration is a one-file change
  when a component actually needs to animate them.
