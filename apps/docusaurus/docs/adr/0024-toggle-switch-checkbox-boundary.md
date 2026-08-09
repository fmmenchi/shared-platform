# ADR 0024 — Toggle, Switch and Checkbox: three controls, one boundary, decided before the second one ships

- **Status:** accepted (2026-08-08)
- **Date:** 2026-08-08
- **Deciders:** Fabio Menchicchi

> Applies [ADR-0002](./0002-ui-library-foundations-decision.md) (native-first, no behaviour layer)
> and [ADR-0016](./0016-minimal-semantic-markup.md) (an element must earn its place) to the one
> place where those two rules do not settle the question by themselves: three controls that look
> alike, behave alike, and mean three different things. Nothing here reverses either.

## Context and problem statement

`Checkbox` shipped. `Switch` was the roadmap's next item — the first Next, chosen because it has a
native shell and fills a real affordance gap. `Toggle` was on no list at all, and the package
contained **not one `aria-pressed`** in sixty-odd components.

That combination is the problem, and it is a specific one rather than a gap in coverage.

A switch is the most reached-for of the three. Ship it alone, into a package that has no toggle,
and the next toolbar that needs a bold button is built out of the nearest thing that holds a state
— which is the switch. It fits: it is small, it is on or off, it even looks right once the knob is
restyled. What it does is tell a screen reader "switch, on" about a button that formats the
currently selected word, and that sentence is wrong in a way nobody sighted will ever notice. The
same pressure produced the other half of the mistake elsewhere: a checkbox restyled into a pill
because "it's the same thing with different CSS".

So the question is not "should we build a toggle". It is **where the line between the three runs**,
answered while all three are being designed rather than after one of them has been misused in
somebody's product — because at that point the fix is a migration, not a decision.

The three differ in the accessibility tree, which is the layer that cannot be restyled:

| Control    | Element                                 | State property | Announced as      |
| ---------- | --------------------------------------- | -------------- | ----------------- |
| `Toggle`   | `<button aria-pressed>`                 | `aria-pressed` | button, pressed   |
| `Switch`   | `<input type="checkbox" role="switch">` | `aria-checked` | switch, on        |
| `Checkbox` | `<input type="checkbox">`               | `checked`      | checkbox, checked |

They are not interchangeable and they are not restylings of each other. `aria-pressed` and
`aria-checked` are different properties, and an element carrying the wrong one is not "slightly
off" — it is describing a different kind of control.

## Decision drivers

- The mistake is invisible to the person making it. Only a screen reader, a form submission or a
  Windows High Contrast user finds it, and all three find it in production.
- A design system that ships one of a confusable set invites the others to be faked out of it.
- Three controls, three sentences. If the boundary needs a paragraph per control, it will not be
  remembered and therefore will not be followed.
- Whatever we write must be checkable, not merely stated. Prose drifts; a test does not.

## Decision

### 1. All three exist, and the boundary is a question about the USER's intent, not the visuals

| You are asking                                | Component  | Has a form value |
| --------------------------------------------- | ---------- | ---------------- |
| apply this to **what is selected right now**  | `Toggle`   | no               |
| **this setting** is on, from now on           | `Switch`   | yes              |
| include this in **what I am about to submit** | `Checkbox` | yes              |

`Checkbox` is also the only one of the three that **ships** a third state
(`checked="indeterminate"`). ARIA defines `aria-pressed="mixed"` too — a bold button over a
part-bold selection is a real state — and `pressed` may take it the day something needs it, in the
shape `checked` already uses. Until then it is not exposed, and nothing about the boundary depends
on it.

Restated as the test to apply, in order:

1. Does it act on **this thing here** — the selection, this view — and stop mattering once you
   navigate away? **Toggle.**
2. Is it a **preference that outlives the page**, taking effect the moment it is flipped, with no
   Save? **Switch.**
3. Is it **one of several things being included** in what you send, with the effect waiting for the
   submit? **Checkbox.**

Nothing in that list mentions shape, size or where the control sits. A pill is not a switch, a
square is not a checkbox, and a control in a toolbar is not automatically a toggle.

### 2. `Toggle` is a button, and therefore composes `Button`

It renders `<button type="button" aria-pressed>`, takes no `as` (an `<a>` navigates, it does not
hold a state) and no `variant` (quiet off, filled on — a toggle whose two states differ by nothing
nameable is not a toggle). It composes `Button` the way `DialogClose` does, so the sizes, the 44px
coarse-pointer target, the focus ring, the icon slots and the pending state are the ones already
tested there rather than a second copy that will drift.

**It has no form value and never submits.** That is not an omission to be fixed later; it is the
half of the boundary that a consumer can actually feel.

### 3. `Switch`, when it ships, keeps the native input

`<input type="checkbox" role="switch">` — the shell that gives it a form value, a `name`, and
participation in `form.reset()`. A switch drawn out of a `<button>` would have the right announcement
and none of the form behaviour that separates it from a toggle in the first place.

**A switch that needs a Save button is the wrong component.** "Applies immediately" is the whole of
what a switch means to the person using it. When there is a Save, the honest control is a checkbox.

### 4. Where the state lives follows the existing rule, and lands differently for each

The rule (`packages/client/ui/.agents/doc/primitives.md`) is that the DOM holds the state of
controls the **browser** paints. So:

- `Checkbox` and `Switch` are painted by the browser: the DOM holds `checked`, and the component
  stays transparent ([ADR-0013](./0013-form-controls-contract.md)).
- `Toggle`'s state is painted by nobody — `aria-pressed` is an attribute we write — so it holds it
  in React through `useControlled`, exactly as `Tabs` does and for the same reason.

That the same rule produces opposite implementations for two controls that look alike is the
clearest evidence that they are not variants of one thing.

### 5. The boundary is enforced where it can be, and written where it cannot

`Toggle`'s component test asserts that it exposes the `button` role and **neither** `checkbox` nor
`switch`, and that it does not submit the form it sits in. Those two are the failure modes of the
confusion, so they fail the build rather than a review.

## Consequences

- Three components instead of one flexible one, which ADR-0016's "must earn its place" endorses
  here: what is being avoided is not markup, it is three different announcements collapsing into
  one wrong one.
- `Toggle` ships before `Switch`, out of roadmap order. That is the point — the boundary exists
  before the control most likely to be misused arrives.
- `Switch` now has a written contract to satisfy on the day it is built, rather than a design
  decision to re-litigate.
- A future `ToggleGroup` (one-of-many, roving tabindex) is not this component and does not change
  this boundary: "exactly one of these" is a radio group's question, and a group of toggles that
  enforces it needs its own decision.
