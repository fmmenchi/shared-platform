# ADR 0003 — Browser support target: Web Platform Baseline

- **Status:** proposed
- **Date:** 2026-07-18
- **Deciders:** Fabio Menchicchi

> Proposed, not accepted. The tooling described here already landed (PR #7) as an implementation
> of this proposal so it could be validated in CI, but the _policy_ is still open: if this ADR is
> rejected, the tooling is reverted. This is the draft under review.

## Context and problem statement

The platform ships browser-facing code (`scope:client` — the design system today) as packages
consumed by **external** repos we do not control. That raises a question every such package
implicitly answers: **which browsers, and which web-platform features, may we rely on?**

Until now the answer was ad hoc — decided per feature, from memory. That failed concretely: the
i18n direction logic used `Intl.Locale.prototype.getTextInfo`, which _looks_ standard but is **not**
supported across the core browser set (Firefox shipped it late). Nothing caught it; it would have
silently treated Arabic as LTR on a browser we ostensibly support. An ad-hoc, memory-based target
is unenforceable and doesn't scale across packages and contributors.

We need a **defined, enforceable** browser-support target.

## Decision drivers

1. **Published to external consumers.** We can't assume the consumer polyfills or transpiles our
   output; what we emit must run as-is in their users' browsers.
2. **A moving target, not a matrix.** Hand-maintaining a browser version matrix rots. We want a
   target that updates itself as the web platform evolves.
3. **Enforceable in CI**, not a promise in a doc. A support policy nobody can check is worthless
   (see the `getTextInfo` incident).
4. **Conservative for a shared foundation.** Many repos will depend on these packages; a broken
   feature fans out widely. Prefer stability over access to the newest APIs.
5. **SSR/runtime-safe** authoring is already required (ADR-0001); this complements it.

## Decision

**Target Web Platform _Baseline: Widely available_.** Baseline is the WebDX/web-features standard:
"Widely available" means a feature has been supported across the core browser set (Chrome, Edge,
Firefox, Safari) for **30+ months**. It is a moving target maintained upstream — exactly driver 2.

Enforce it with three tools, each covering a different layer:

| Layer                    | Tool                                                 | Scope                                                                                                          |
| ------------------------ | ---------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Build target             | `browserslist-config-baseline` (root `package.json`) | the compiler (Tailwind/Lightning CSS, esbuild) emits CSS/JS for Baseline — the **real lever for compiled CSS** |
| JS / builtins / Web APIs | `eslint-plugin-baseline-js` (`available: "widely"`)  | shippable `**/src/**` of `scope:client` packages, via `eslint.baseline.mjs`                                    |
| Plain CSS                | `@eslint/css` `use-baseline`                         | hand-written stylesheets we ship (token vars + presets)                                                        |

### Why "Widely" and not "Newly"

"Newly available" (supported everywhere _now_, possibly < 30 months) is more permissive. For a
foundation consumed by many repos we choose the conservative tier: a feature has soaked for 2.5
years across all engines before we depend on it. The cost — no access to the newest APIs — is
acceptable for a shared layer, and can be handled per-case (see escape hatch).

## Consequences

**Positive**

- One defined, self-updating target instead of per-feature guesswork.
- CI fails on a non-Baseline JS/Web-API in shipped source — the `getTextInfo` class of bug is now
  caught by machine, not memory.
- Forced a genuine improvement: direction detection moved from the non-Baseline `getTextInfo` to
  `Intl.Locale.maximize().script` (Baseline), which is also more correct (`az-Arab` → rtl).

**Negative / limits (honest)**

- **The linter is not exhaustive.** It flags what `web-features` maps (e.g. `Promise.withResolvers`,
  `structuredClone`) but misses cases — including `getTextInfo` itself. Tooling **and** review.
- **Tailwind-authored CSS can't be source-linted** (`@eslint/css` rejects `@apply`/`@reference`), so
  our precompiled component CSS relies on the browserslist target, not the CSS lint, for Baseline.
- **Per-package wiring.** Baseline is browser-only, so it's imported per `scope:client` package, not
  in the root ESLint config (which also governs Node `server`/`shared`). A new client package must
  opt in.
- **Newest APIs are off-limits by default**, needing an explicit, reviewed exception.

**Escape hatch**

A justified non-Baseline feature is allowed with an inline `eslint-disable` for
`baseline-js/use-baseline` **plus a comment** stating the feature, why it's needed, and its fallback
(or the runtime guarantee that makes it safe). The point is a deliberate, reviewed exception — not
silence.

## Alternatives considered

- **Baseline: Newly available.** Rejected as the default — too permissive for a shared foundation
  (see above). May be revisited per-package if a package's consumers are known-modern.
- **An explicit `browserslist` matrix** (e.g. `last 2 versions`, `not dead`). Rejected: it rots,
  drifts from "what's actually safe," and doesn't map to the JS/Web-API lint the way Baseline does.
- **No policy (status quo).** Rejected: unenforceable; the `getTextInfo` incident is the evidence.

## Open questions

- Should any package target **Newly** instead of Widely (known-modern consumers)?
- Cadence for revisiting the tier as Baseline advances.
- Should the escape hatch require an ADR-style note for anything load-bearing, or is an inline
  comment enough?

## Status note

If accepted: update to `accepted`, keep the tooling. If rejected: revert PR #7 and record why.
