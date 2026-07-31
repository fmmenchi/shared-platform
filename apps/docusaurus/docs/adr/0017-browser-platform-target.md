# ADR 0017 — Browser platform target: Baseline Widely, with Newly as graceful enhancement

- **Status:** accepted (2026-07-30) — consolidates [ADR-0003](./0003-browser-support-baseline.md) and [ADR-0010](./0010-progressive-enhancement-beyond-widely.md)
- **Date:** 2026-07-30
- **Deciders:** Fabio Menchicchi

> Supersedes 0003 and 0010, whose text stands unchanged for the record. Nothing here reverses either
> decision: 0010 already declared itself an extension of 0003, and reading them apart made the policy
> look like a rule plus an exception when it is one policy with two tiers.

## Context and problem statement

We publish browser-facing code to repositories we do not control, so every package implicitly answers
a question: **which browsers, and which web-platform features, may we rely on?**

The answer used to be ad hoc — decided per feature, from memory — and it failed concretely. The i18n
direction logic used `Intl.Locale.prototype.getTextInfo`, which _looks_ standard but was not supported
across the core browser set (Firefox shipped it late). Nothing caught it, and it would have silently
treated Arabic as left-to-right on a browser we claimed to support.

But a single conservative line has its own failure: features cross into wide support every month, and
some of the newest are both transformative and _perfectly degradable_. `@starting-style` animates a
dialog's entry in pure CSS, and a browser without it simply shows the dialog instantly — fully
functional. A blanket "widely or nothing" forbids value that costs nothing.

So the target needs two tiers, not one line.

## Decision

### The default tier: Baseline Widely available

**Target Web Platform Baseline: Widely available** — supported across Chrome, Edge, Firefox and Safari
for 30+ months. It is a moving target maintained upstream, which is the point: a hand-written browser
matrix rots, and "what's actually safe" drifts away from it.

Enforced by three tools, each covering a layer no other reaches:

| Layer                    | Tool                                                | Scope                                                              |
| ------------------------ | --------------------------------------------------- | ------------------------------------------------------------------ |
| Build target             | `browserslist-config-baseline` (root package.json)  | what the compiler emits — the real lever for compiled CSS          |
| JS / builtins / Web APIs | `eslint-plugin-baseline-js` (`available: "widely"`) | shippable `**/src/**` of `scope:client`, via `eslint.baseline.mjs` |
| Plain CSS                | `@eslint/css` `use-baseline`                        | hand-written stylesheets we ship (token vars, presets)             |

**Widely is a floor to stand on, not a ceiling to avoid.** When a feature crosses the line, adopting it
is encouraged rather than exceptional — re-check periodically what has crossed.

### The second tier: Newly, only as graceful enhancement

A **Newly available** feature may be used when all three hold:

1. **the experience without it is fully functional** — no broken layout, no lost capability, only
   polish forgone (an entry animation, an interpolated theme crossfade);
2. **the usage is marked and auditable** — a lint-disable carrying the justification and the expected
   Widely date, plus an `@supports` guard wherever the declaration would otherwise be invalid:
   `/* eslint-disable-next-line css/use-baseline -- progressive: degrades to instant open; widely ~2027-02 */`
3. **it is recorded in the [known-issues ledger](../known-issues.md)** — feature, where it is used, how
   it degrades, Widely ETA. When the feature goes Widely, the comment _and_ the entry are removed: the
   exception expires by design.

**Not degradable ⇒ not yet.** A Newly feature whose absence breaks function waits — unless the
maintainer grants an explicit waiver, recorded in the ledger like any other exception, typically when
the Widely date lands before any consumer could realistically ship.

### Why Widely and not Newly as the default

For a foundation many repositories depend on, a broken feature fans out widely, so the conservative
tier is right: 2.5 years across all engines before we depend on something. The cost — no access to the
newest APIs — is exactly what the second tier buys back, case by case and with an audit trail, instead
of by lowering the floor for everything.

## What this has already decided

- **Rejected** at the token-contract stage: runtime relative colour syntax, and `@property` as a
  _requirement_ — which in turn surfaced 47 out-of-gamut values the browsers were silently re-mapping.
- **Adopted** on crossing: `linear()` easing, used for spring personalities as tokens
  (`--fm-ease-spring`, `--fm-ease-bounce`) — what JS motion libraries sell as "behaviours", with no
  runtime.
- **Enhancement, approved:** `@property`-typed token roles for interpolation ([ADR-0018](./0018-how-the-ds-ships-css.md)) — untyped custom properties without it, losing only the polish;
  `@starting-style` + `allow-discrete` for a future Dialog's entry and exit.
- **Waiver, 2026-07:** the Popover API — not gracefully degradable, but its Widely date lands before
  any consuming component ships. Tracked in the ledger until then.
- **Fixed by the policy itself:** direction detection moved from `getTextInfo` to
  `Intl.Locale.maximize().script`, which is Baseline _and_ more correct (`az-Arab` → rtl).

## Consequences

- One self-updating target instead of per-feature guesswork, and the platform's pace instead of 30
  months behind it.
- Every exception is greppable (`use-baseline --`), justified, dated and self-expiring.

**Honest limits.**

- **The linter is not exhaustive.** It flags what `web-features` maps and misses cases — including
  `getTextInfo` itself, the very incident that motivated the policy. Tooling _and_ review.
- **Tailwind-authored CSS cannot be source-linted** (`@eslint/css` rejects `@apply`/`@reference`), so
  our precompiled component CSS relies on the browserslist target, not the CSS lint.
- **Per-package wiring.** Baseline is browser-only, so it is imported per `scope:client` package. A new
  client package must opt in — nothing does it automatically.

## Revisit

| When          | What                                                                                                                               |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| ~Jan 2027     | `@property` reaches Widely → the typed token roles stop being an enhancement and become plain adoption                             |
| ~Jan 2027     | Relative colour syntax reaches Widely → reconsider runtime ramp derivation (likely keep static: gamut and validation stay simpler) |
| Every January | Is Widely still the right floor, and what crossed the line this year                                                               |
