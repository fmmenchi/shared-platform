# ADR 0022 — Browser defaults: components normalise themselves, the page baseline is optional

- **Status:** accepted (2026-08-01)
- **Date:** 2026-08-01
- **Deciders:** Fabio Menchicchi

> Extends [ADR-0018](./0018-how-the-ds-ships-css.md), which said the shipped CSS carries no Tailwind
> Preflight but never said what takes its place. Nothing here reverses it.

## Context and problem statement

We ship precompiled CSS and no reset. That is deliberate — importing a design system must not
restyle the consumer's headings and lists — but it leaves a question nobody had answered: **if no
reset arrives, who undoes the browser defaults our components depend on?**

For a long time the answer was "each component, when someone notices". The record is unambiguous
about how well that worked. `git log -S` over the component sources:

| declaration                       | commits | kind            |
| --------------------------------- | ------- | --------------- |
| `font-family: inherit`            | 2       | **both `fix(`** |
| `box-sizing`                      | 2       | **both `fix(`** |
| `appearance` (select)             | 1       | `feat(`         |
| `resize` (textarea)               | 1       | `feat(`         |
| `margin` (checkbox)               | 1       | `feat(`         |
| groove border, padding (fieldset) | 1       | `feat(`         |

The split is not random. The **element-specific** defaults were all authored upfront, in the
component's own feature commit; the **cross-cutting** ones were all found afterwards, in production,
and fixed reactively. You ask yourself whether a `<fieldset>` has a groove border while writing a
fieldset. You never ask whether a control inherits the page font.

They were found late for a structural reason: **the surfaces we develop on were not the surface we
ship.** Storybook and the test suite both imported `@fmmenchi/tokens/styles/tailwind.css`, which does
`@import 'tailwindcss'` and so pulled in Preflight. Every place we looked at a component or asserted
on it was a page no consumer has, and this entire class of defect was invisible by construction. When
Preflight was removed, two defects surfaced within minutes — a spinner `<span>` whose 2px ring made
it 4px too wide, and a legend whose margin named a Tailwind bridge alias that ships nowhere.

There is also a cascade constraint that rules out the obvious fix. Under ADR-0018 our rules live in
`@layer fmmenchi`, and **an unlayered rule beats a layered one at any specificity**. So a reset we
ship inside our layer is defeated by the consumer's own reset; and a reset we ship _unlayered_ would
beat our own components. A shipped reset cannot be a guarantee either way.

## Decision drivers

- A defect a consumer sees must be visible to us before they see it.
- The design system has authority over the elements it renders, and none over the consumer's page.
- Whatever we ship must survive both an app with no reset and an app with a strong one.
- Reasons are written once. Four copies of the same measurement drift.

## Decision

### 1. The design system ships no reset, and no component depends on one

A consumer who imports nothing but our CSS gets components that render correctly. This is a
guarantee, not a default — it is what makes the package safe to drop into a page we know nothing
about.

### 2. A component normalises itself, on its own class, never on an element selector

The cross-cutting pair — `box-sizing: border-box` and `font-family: inherit` — is one DS-authored
utility, `control-base` (`@fmmenchi/ui/src/styles/utilities.css`), that Button, Input, Select and
Textarea `@apply`. `@apply` **inlines** the declarations into the component's hashed class, so it
reaches our button and never the consumer's.

That is also what makes it robust where a reset would not be: a rule on `button {}` inside
`@layer fmmenchi` loses to any unlayered `button {}` the consumer has, while a declaration inlined
into `._button_abc` only loses to a rule that names our hashed class — which nobody writes.

Anything true of **one element only** stays with that element, where its reason is: Button's
`border: 0`, Select's `appearance: none`, Textarea's `resize`, Checkbox/Radio's `margin: 0`,
Fieldset's groove border. The evidence above says those are the ones we get right unprompted.

### 3. The development surfaces load exactly what a consumer loads

Storybook and the test suite import `vars.css`, never `tailwind.css`. They get the token **values**
and no Preflight. `@apply` still resolves, through the per-file `@reference`, which emits nothing.

This is the decision that keeps the other two honest: without it, a component may quietly stop
normalising itself and every gate stays green.

### 4. A page baseline is offered, never required, and cannot beat the components

`@fmmenchi/tokens/styles/baseline.css` exists for an app that wants one. It is **not** Preflight and
not a copy of one: an app on Tailwind already has Preflight for free, and Preflight is opinionated
about content we do not own — it flattens headings and strips list markers. Ours is neutral and
themed: `<h1>` stays a heading, `<ul>` keeps its markers, and `body` picks up the background and
foreground roles so a `[data-theme]` preset re-themes the page and not only the widgets.

It ships inside `@layer fmmenchi.base`, the nested sublayer ADR-0018 anticipated. A layer's own rules
beat its sublayers, so the order falls out of the cascade with nothing for the consumer to declare:

```
fmmenchi.base   <   fmmenchi (the components)   <   the app's own css
```

This is why the baseline may style bare elements at all. It cannot win against a component, and an
app with no layers overrides all of it with a plain rule.

## Consequences

- Adding a control means applying `control-base`; the reasons and the measurements are read once,
  in one file, instead of being re-derived and half-remembered.
- The failure mode changes character. A missing normalisation is no longer silent until a consumer
  reports it — it is visible in Storybook and, where a test asserts a size, red in CI. It is not
  _impossible_: the suite is not a visual regression suite, and it catches only what it asserts.
  `form-error-summary`'s `<ul>` still carries its markers on a page with no reset, and no test says
  so. The gain is that finding the next one now means looking, not reasoning.
- The consumer's page is untouched unless they opt in, and the promise in `docs/styling.md` —
  "importing our CSS never restyles the consumer's page" — is true rather than nearly true.
- `selection` / `selection-foreground` finally have a consumer. Roles the contract declares and
  nothing uses are how a token silently diverges from reality; the baseline is where the page-level
  ones belong.
- One honest gap remains, and it predates this ADR: `fieldset.mdx` tells consumers to import an
  unlayered reset **before** our stylesheet, because an unlayered `fieldset {}` in their reset beats
  our layered one. Decision 2 does not reach it — a `<legend>` cannot be re-parented onto a class.
  It is a documented consumer instruction, in a component doc rather than the consuming guide.

## Alternatives considered

- **Ship Preflight, or a copy of it, as part of the DS CSS.** Rejected: it restyles content we do not
  own, and it would make every component depend on a global side effect — the exact coupling
  decision 1 exists to avoid.
- **Ship a reset inside `@layer fmmenchi` and let components rely on it.** Rejected on the cascade:
  the consumer's unlayered reset beats it, so components would depend on something that silently
  stops applying in precisely the apps most likely to have opinions about CSS.
- **Keep going per component, with no shared definition.** Rejected as the status quo the evidence
  indicts — though only for the cross-cutting pair. For element-specific defaults it is still the
  decision, because it is what the record shows we get right.
- **A marker class on every component root, carrying the normalisation.** Rejected for now: it buys
  automatic coverage for future components at the cost of a class that exists for no other reason,
  which ADR-0016 argues against. Revisit if the utility is forgotten on a new control.
