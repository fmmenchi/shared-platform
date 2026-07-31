# ADR 0018 — How the design system ships CSS: one cascade layer, typed tokens, no motion runtime

- **Status:** accepted (2026-07-30) — consolidates [ADR-0009](./0009-motion-css-first.md), [ADR-0011](./0011-cascade-layers.md) and [ADR-0012](./0012-typed-tokens-at-property.md)
- **Date:** 2026-07-30
- **Deciders:** Fabio Menchicchi

> Supersedes 0009, 0011 and 0012, whose text stands unchanged for the record. Nothing here reverses
> them. They were three answers to one question — _what exactly arrives at the consumer, and what can
> they do with it_ — and apart they read as unrelated CSS trivia.

## Context and problem statement

We ship **precompiled CSS**: `@fmmenchi/ui/style.css` and per-component subpaths, imported as-is by a
consumer who runs no Tailwind and scans no source of ours. Everything follows from that one fact.

It means the consumer cannot reach inside a component to adjust it — their only lever is to write CSS
that beats ours, and with single-class selectors that is a specificity war ending in `!important`.

It means the tokens are the theming surface, and a plain custom property is an untyped string to the
browser: a `[data-theme]` flip snaps instead of crossfading, and nothing can be tweened.

And it means motion has to arrive in that same CSS, or it arrives as a runtime the consumer did not
ask for.

## Decision

### 1. Every component rule ships inside one cascade layer, `fmmenchi`. Tokens stay unlayered.

Any unlayered declaration beats any layered one **regardless of specificity** — that is the platform's
answer to the override problem, and the reason a consumer can restyle us with a plain rule.

- **Components** wrap all their rules, `@media` blocks included, in `@layer fmmenchi { … }`. `@import`
  and `@reference` stay above it (they must precede any style rule); `@keyframes` stay out (they are
  name-scoped and take no part in the property cascade). The generator template opens the layer, so
  the archetype propagates it.
- **Tokens stay UNLAYERED.** `:root { --fm-* }` is the substrate every layer resolves `var()` against;
  keeping custom-property definitions out of any layer means they are always in scope and a consumer
  can reassign a role from anywhere.
- **The consumer contract:** an app with no layers needs to do nothing — its ordinary CSS already
  wins. An app that uses layers orders ours with one statement before importing: `@layer fmmenchi, app;`.
- **One flat layer, for now.** Component rules target disjoint class names, so intra-DS ordering is
  moot. A future base or utilities layer lands as nested sublayers, which does not move the
  consumer-facing boundary.

This is what lets the DS stay strict internally — single-class selectors, no escalation — without
boxing consumers in.

### 2. The semantic roles are `@property`-typed, so they interpolate

Registered in a co-located `styles/properties.css`, imported at the top of `vars.css`. **Only the roles
with a real payoff:** colours (`<color>`) unlock theme crossfade and gradient tweens, radius
(`<length>`) unlocks shape animation. Fonts, spacing, duration and shadows stay unregistered —
registering a capability nothing uses is a phantom contract.

Two details are load-bearing:

- **`initial-value` is a sentinel, never the real value** (colours use `oklch(0 0 0)`). With `:root`
  and `inherits: true` the true token always cascades over it, so the type layer duplicates no
  literal and single-source survives. This is the crux that makes mass registration safe.
- **Radius `initial-value` must be absolute px**, because a non-universal `syntax` requires a
  computationally independent value and `rem` is font-relative — the browser rejects the rule
  otherwise. The px equivalents at a 16px root are a registration detail, not a source of truth.

Coverage is asserted against `COLOR_ROLES` + `RADIUS_TOKENS`, and a test pins every colour
`initial-value` to the sentinel, so the type layer cannot drift from the contract.

`@property` is Baseline **Newly**, so this ships as a graceful enhancement under
[ADR-0017](./0017-browser-platform-target.md): without support the roles are plain untyped custom
properties, every component renders identically, and only the interpolation polish is lost. One
justified file-level disable, one ledger entry, both retiring when it goes Widely (~2027-01).

### 3. Motion is CSS on the tokens. No motion runtime — ever.

- **CSS covers nearly all of it**: press, fades, slides, spin, surface enter — transitions and
  keyframes paired with the tokens (duration by surface size, ease by direction). Shared keyframes
  ship as `@fmmenchi/tokens/styles/motion.css`, since keyframes cannot live in the values-only
  `vars.css`. Tailwind's stock `animate-*` presets are reset in the bridge, and lint bans raw
  durations and curves in declarations _and_ in `@apply`.
- **WAAPI for the one imperative case.** A closing `<dialog>` hits `display: none` before a CSS
  transition can run; the platform fix (`@starting-style` + `transition-behavior: allow-discrete`) is
  not Widely until ~2027. Until then `animateExit` runs the exit via `element.animate()` — token-driven,
  reduced-motion-aware, cancel-safe — and **it retires when the platform matures**. The architecture
  simplifies with the platform instead of accreting around it.
- **Not framer-motion:** 15–34 kB of mandatory runtime for every consumer, to buy springs, FLIP and
  gestures that primitives do not need — CSS transitions are already interruptible. Like icon sets, a
  motion library is an **app** concern: an app may use one; the DS never imposes it.
- **Reduced motion:** disable the **transform**-bearing animations, because movement is the vestibular
  trigger (WCAG 2.3.3); keep pure opacity fades. Per animation, not by zeroing every duration.

## Consequences

- Overriding a component is a plain rule again: the DS is themable via tokens **and** patchable via
  CSS, with no specificity escalation.
- The shipped `dist/*.css` gains one `@layer fmmenchi{ … }` wrapper — no runtime cost, no bundle
  growth beyond the wrapper.
- Theme crossfade and token-driven animation become possible, and stay **opt-in**: the registration is
  the enabler, the consumer adds the `transition`.
- A malformed token assignment falls back to the sentinel rather than poisoning the cascade — largely
  redundant with build-time `validateTheme()`, and carrying a mild risk of rendering a sentinel colour
  instead of failing loudly, which is why consumers are told to run `validateTheme()` in their own CI.
- Zero motion dependencies; the shipped CSS is the whole motion story, themable at runtime.
- View Transitions and scroll-driven animations stay watchlisted until they cross the Widely line.
