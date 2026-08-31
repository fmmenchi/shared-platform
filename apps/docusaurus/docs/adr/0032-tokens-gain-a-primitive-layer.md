# ADR 0032 — Tokens gain a primitive layer, derived with relative colour

- **Status:** accepted (2026-08-29) — takes a waiver under [ADR-0017](./0017-browser-platform-target.md), which stands
- **Date:** 2026-08-29
- **Deciders:** Fabio Menchicchi

## Context and problem statement

The token contract has **one** level. `--fm-color-primary` is assigned
`oklch(41% 0.135 255)` directly, and so are the other 83 roles — measured: **0** of them reference
another token, **84** carry a literal. `vars.css` describes those numbers as "resolved at authoring
time from the ramp methodology (base ± lightness, scaled chroma)", which is exactly what happened:
the ramp was applied by a person and only its output was kept.

Three costs, all of them paid twice because `presets/dark.css` is a second complete assignment:

**The dark theme is 84 numbers instead of a rule.** Nothing in the file states the logic it follows,
because there is no logic in the file — there are values. Whether every family moves consistently
between the themes cannot be checked, only re-read.

**A rebrand is 8 edits per family, done by hand.** Moving `primary` means recomputing its fill,
hover, active, subtle, the two inks and the disabled pair, applying from memory the formula the
comment describes.

**Shared values are coincidences rather than statements.** `--fm-color-link` is
`oklch(41% 0.135 255)` — the same string as `--fm-color-primary`, to the last decimal. So is
`selection` against `primary-subtle`. Nothing says so; it was found by diffing strings while building
a documentation page, which is not a maintenance strategy.

Measured on the existing values, the ramp is **already there in the lightness**: across all seven
brand and status families, `hover` is base − 0.10, `active` is base − 0.19, `subtle` is base + 0.49
and `disabled` is base + 0.39. What is irregular is the chroma: the `subtle` multiplier ranges from
0.23 (destructive) to 0.87 (accent), and `accent-disabled` is 1.19 — _more_ saturated than the fill it
disables, which no monotonic curve produces. The likeliest explanation is that chroma was bent
wherever a pair needed to clear AA.

## Decision

**Three levels, and the middle one is derived in CSS.**

1. **Primitives** — one `--fm-<family>-base` per family, plus the neutral ramp written explicitly.
2. **Palette** — `50…900` per family, derived from its base with relative colour syntax:
   `oklch(from var(--fm-primary-base) calc(l - 0.10) calc(c * 0.86) h)`.
3. **Roles** — the 84 semantic tokens, each `var()`-ing a palette step. Components keep consuming
   only these, unchanged; the Tailwind bridge is untouched.

The dark preset overrides the **bases** and **remaps the roles** — no colour literals.

**One curve for every family.** The per-family chroma multipliers are not preserved: a single curve
is the point of having one, and keeping seven sets of coefficients would move the hand-maintained
numbers rather than remove them. Consequence accepted deliberately: **roughly 20 of the 84 values
change**, most visibly `destructive-subtle` (chroma 0.23 → ~0.45) and `accent-disabled` (1.19 → ~0.6).

**The palette is internal to the package, not to the file.** Components consume
roles and only roles. But an app writing its own brand preset assigns all 84 of
them — that is what the public `validateTheme()` exists for — and for that app
the ramp is the raw material: without it, a preset means inventing 84 oklch
values by hand, which is the work this layer exists to remove. So the scale is
deliberately COMPLETE rather than trimmed to what this workspace happens to use,
and the neutral ramp is shared between presets rather than restated by each.

**The neutrals stay explicit.** They are every surface, border and disabled role in the system, and a
single base cannot produce the fine steps surfaces need — the same conclusion the reference
implementation reached, whose neutral ramp is hand-written with extra steps while its brand ramps are
derived.

## Consequences

**The contrast gate has to be rebuilt, and this is the non-negotiable part.** `tokens.test.ts` reads
the stylesheet and parses each value with culori; `parseColor('oklch(from var(…) calc(…) …)')` is
`undefined`, so both the parseability test and every contrast assertion would fail — not because a
colour is wrong, but because the test can no longer see it. A resolver is added to the package: it
expands `var()` references and evaluates the one relative-colour form used here, so the gate verifies
the **derived** values, in Node, on both presets. AA is a requirement, not an aesthetic: if the single
curve drops a pair below 4.5, the pair is retuned — by moving which step the role points at, which is
now a one-line change.

**A second net already exists.** Every story runs axe in a real Chromium with `a11y: { test: 'error' }`,
so a contrast regression that escaped the unit gate would fail the story suite too.

**CSS toolchains do not all understand it yet**, and that is a second cost the
waiver carries. Measured while configuring the docs site: `postcss-calc` emits
`Lexical error … Unrecognized text` on every `calc(l - 0.3)` inside an
`oklch(from …)`. It warns and passes the declaration through unchanged — the
built stylesheet still contains the relative colour — but a minifier that decided
to "fix" what it cannot parse would silently break the ramp, which is exactly how
`:dir()` was once downlevelled into a language sniff (ADR-0023's guard exists for
that). A consumer on an aggressive CSS pipeline should check its output, not
assume it.

**Relative colour is not gracefully degradable**, and that is what makes this a waiver rather than an
enhancement. Where it is unsupported the declaration is invalid at computed-value time, the `var()`
chain does not resolve, and components lose their colour outright — there is no "degraded" state.
[ADR-0017](./0017-browser-platform-target.md) allows exactly this case: a Newly feature whose Widely
date lands before any consumer could realistically ship. Relative colour reaches Widely ~January 2027
(Firefox 128, July 2024, plus 30 months); the only consumers today are this workspace's own docs site
and the ports-validation app. Same reasoning as the Popover waiver of 2026-07.

## A role may leave the ramp, and that is not a failure

**Any role may hold its own value, with a comment saying why.** The ramp exists
to remove numbers nobody can account for, not to forbid a number somebody can.

This is stated because the alternative is a trap. A derived system moves the
cost of a fix: where a wrong colour used to be one number to change, it becomes
a choice between moving a step (and everything else pointing at it, in both
themes), adding a step, or pointing somewhere else. Without a fourth option a
maintainer facing an irreducible tuning has no legal move, and the pressure goes
into distorting the scale for one case — which is how a scale stops being one.

The system already does this and nobody has called it a violation: `scrim` is a
literal with alpha, the three shadows are literal `rgba()`. They are not
failures of the ramp, they are colours that are not ramp steps.

The conditions are only that it be **deliberate and legible**: a comment naming
what the value is for and why the ramp could not supply it. The gates do not
care either way — completeness, gamut and contrast are checked on the resolved
value, whether it came from a formula or from a person.

What is NOT acceptable is the state this ADR found: 84 literals with no stated
reason, several of them the same value by accident, and the ramp methodology
they came from described in a comment but present nowhere in the code.

## Considered options

**Keep one level.** Rejected: it is the status quo whose three costs are measured above.

**Precompute the ramp into literals, keeping three levels.** The structure and every benefit except
one — the CSS stops stating the rule and states its output again, so `dark.css` is still legible but
the palette is not. It also stays within Widely, and remains the fallback if the waiver has to be
withdrawn.

**Both declarations: a static fallback, then the derived override.** Genuinely degradable, and it
keeps the gate readable in Node with no resolver. Rejected for now on cost: the fallbacks must be
generated from the formula to avoid becoming a second source of truth, `parseVars` throws on duplicate
declarations by design, and that is a build-time generator plus a change to a guard that exists for a
good reason. Reconsider if a consumer needs the older floor.

**Derive lightness, keep chroma per family.** Colour-invariant, so the gate stays green by
construction and the irregularities stay visible where contrast imposed them. Rejected as
half-measure: it keeps a table of hand-maintained coefficients, which is the thing this ADR exists to
remove.
