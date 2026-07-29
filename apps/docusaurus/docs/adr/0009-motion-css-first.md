# ADR 0009 — Motion is CSS-first on the tokens; no motion runtime

- **Status:** accepted (2026-07-28)
- **Date:** 2026-07-28
- **Deciders:** Fabio Menchicchi

## Context and problem statement

With Dialog/Toast/Popover next on the component roadmap, the DS needs a settled animation story.
The candidates: a JS motion library (framer-motion/"Motion", motion-one), Tailwind animation
utilities, or plain CSS over the existing motion tokens. Constraints: the DS ships **precompiled
CSS with no runtime**, targets **Baseline Widely available** (ADR-0003), and just shed a runtime
dependency (tailwind-merge) for bundle weight.

## Decision

**CSS-first on the motion tokens, with the Web Animations API for the one imperative case. No
motion runtime — ever.**

- **CSS covers ~all of it.** Component motion (press, fades, slides, spin, surface enter) is CSS
  transitions/keyframes paired with the tokens: duration by surface size, ease by direction,
  `--fm-transition-*` composites. Shared keyframe primitives ship as
  `@fmmenchi/tokens/styles/motion.css` (keyframes can't live in the variables-only `vars.css`);
  components `@import` it so each subpath's css stays self-contained. Tailwind's stock `animate-*`
  presets are reset in the bridge, and lint bans raw durations/curves — in declarations and in
  `@apply` (`duration-150` is dynamic in Tailwind v4, a namespace reset can't stop it).
- **WAAPI for exits.** A closing `<dialog>`/popover goes to `display: none` before a CSS transition
  can run; the platform fix (`@starting-style` + `transition-behavior: allow-discrete`) is not
  Baseline Widely available until ~2027. Until then the `animateExit` primitive (ui) runs the exit
  via `element.animate()` — token-driven (reads `--fm-duration-*`/`--fm-ease-*` off the element),
  reduced-motion-aware, cancel-safe. **It retires when `@starting-style` matures** — the
  architecture simplifies with the platform instead of accreting.
- **Why not framer-motion:** 15-34 kB of mandatory runtime for every consumer, to buy springs,
  layout/FLIP and gestures that primitives don't need — CSS transitions are already interruptible.
  Like icon sets, a motion library is an **app concern**: an app may use one on its pages; the DS
  never imposes it.
- **Reduced-motion doctrine:** disable the **transform**-bearing animations (movement is the
  vestibular trigger, per WCAG 2.3.3 guidance), keep pure opacity fades (change is fine). Applied
  per animation, not by zeroing every duration globally.

## Consequences

- Zero new dependencies; the shipped CSS stays the whole motion story, themable at runtime.
- Dialog/Toast/Popover have a paved road: primitives from `motion.css`, exits via `animateExit`.
- View Transitions and scroll-driven animations stay watchlisted until Baseline Widely.
- The doctrine lives in ui's [motion spoke](../client/ui/index.md) for agents and contributors.
