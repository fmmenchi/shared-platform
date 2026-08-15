# ADR 0029 — MultiCombobox: a second component, a shared list, and where N values ride

- **Status:** proposed (2026-08-15)
- **Date:** 2026-08-15
- **Deciders:** Fabio Menchicchi

> Revises [ADR-0028](./0028-combobox.md) **§4** and **§5**. That ADR stands in every other
> respect — it is still what authorises this component to exist and what states its price. Two of
> its assumptions did not survive building the single-select half, and this records what replaced
> them.

## Context and problem statement

ADR-0028 §5 decided that single and multiple are one component: _"Both ship. Multiple is not a later
addition."_ Single-select has since been built, shipped, and put through three adversarial reviews.
Two things it assumed turned out to be wrong, and neither is a detail.

**§4's carrier is not the carrier that shipped.** It says `<input type="hidden">`. The shipped one
is a CSS-hidden, focusable **text** input, and the difference was measured rather than argued: a
hidden input is in value mode _"default"_, so `form.reset()` restores its current value onto itself
and the field comes back from a reset still holding the choice the user just discarded. The shipped
carrier has a one-shot `defaultValue` seed instead, which gives the platform somewhere to revert to.

**§5 assumed the difference between single and multiple is the cardinality of the value.** It is
not. It is the box.

## Decision

### 1. Two components with a shared list — because a fixed-height control and an elastic container are not one control

`control-sm`, `control-md` and `control-lg` are `h-8`, `h-9` and `h-11`. **Fixed** heights, and the
utility's own comment says why they exist at all:

> The three heights, which match `Button`'s so controls and buttons on one row align.

A field whose chips wrap has no height. It has a `min-height` and it grows — and the moment it
grows, the single reason those three utilities exist stops applying to it. That is not a variant of
`control-box`; it is a different box, and it drags its own decisions in with it: what happens at
twenty chips (wrap, scroll, "+3 more"), how a long label truncates inside a chip, where the focus
ring goes now that the input is a child of the box rather than the box itself.

The box is the clearest of the differences, not the only one. Six things fork, and every one of them
would be a branch inside a function that is otherwise one function:

|                 | `Combobox`              | `MultiCombobox`                |
| --------------- | ----------------------- | ------------------------------ |
| the value       | `string \| null`        | `string[]`                     |
| the field shows | the chosen item's label | always and only the query      |
| after a pick    | the surface closes      | the surface stays open         |
| `aria-selected` | one row, transiently    | every chosen row, persistently |
| the keyboard    | one axis (the list)     | two (the list, and the chips)  |
| the carriers    | one                     | N under one name               |

What is **shared** is the expensive half, and it is why these are one family rather than two
unrelated controls: the filter and its fold, the highlight machine (the `Spot` union, `move`, the
clamp, and the rule that opening highlights nothing), the option ids with `aria-setsize` /
`aria-posinset`, the anchored surface with its coarse-pointer centring, the live region, the create
row, and the list's own keys. Both keep `role="combobox"` — it is **one ARIA pattern**, which is
exactly why the split is two signatures and not two components that happen to look alike.

**The shared layer owns the LIST and never the VALUE.** Three things must stay out of it, because
any one of them brings the rejected boolean back in through the basement: the cardinality of the
value, what the field displays, and whether activating a row closes the surface. The contract is
_"here are the rows, here is where you are, the user just activated spot X"_ — what activating
**means** belongs to the two components.

The shape has a precedent twice over, both from this month and both written after a review found the
duplication rather than before: `control-box`, which was nine decisions restated in two stylesheets,
and `useCarrierSync`, which was three doors restated in two components. This package's rule is that a
policy moves when the second consumer appears. Here the second consumer is certain before a line of
it is written, so it is extracted first.

**Named `MultiCombobox`**, on `DateRangePicker`'s precedent: same family, different cardinality, its
own name rather than a flag. A flag would also force a discriminated overload on the public type
(`multiple: true` narrowing `value` to `string[]`), which is a signature that hides the fact that
these are two controls.

**A tag input is not a third component.** It is this one with `items={[]}`, `freeText` and
`onCreate`.

### 2. N values ride N text carriers, and the port grows a value-shaped group

ADR-0028 §12 left this open deliberately, and predicted the fork: _"If a binding still cannot express
it, multiple binds through that library's controlled API and the carriers stay for `FormData`."_ It
was measured rather than reasoned about — a throwaway spike in `apps/ui-ports-validation`, Chromium,
with the selection held in React state and carriers mounted and unmounted as it changed.

|                                        | N text inputs | N hidden checkboxes, mounted checked       |
| -------------------------------------- | ------------- | ------------------------------------------ |
| `FormData.getAll(name)`                | `["a","b"]`   | `["a","b"]`                                |
| Formik, through the merged option port | `[]`          | `["b"]` — but only after a real `.click()` |
| `form.reset()` on a set React mounted  | **no-op**     | **no-op**                                  |

Three findings, in ascending order of consequence.

**`FormData` is indifferent.** Both shapes submit both values, so the three uncontrolled bindings —
react-hook-form, Conform, React 19 — do not decide this question.

**A controlled library sees only checkboxes.** `checkedInGroup` filters
`element.type === 'checkbox'`, so text carriers are invisible to Formik and TanStack and they store
`[]`. This is the real constraint, and it is in the port rather than in the component.

**`form.reset()` is a no-op on a set React mounted — in _both_ shapes.** This is the finding that
outlives whichever carrier wins, and it is the hidden-input defect from §4 again, one level up and
for the same reason: each control's default is whatever React mounted it with, so the platform
restores every control to itself, and the _number_ of them is React state the platform cannot reach.
**The component owns reset.** `useCarrierSync` already listens for the event; multiple generalises
its seed from one key to a list.

**The decision is N text carriers, and a value-shaped group in the port.**

Checkboxes are rejected on principle and not on capability, which is worth stating plainly because
they were measured working. To make them work the component must mount the carrier **unchecked** —
the bound option is controlled by the library, whose state does not yet contain the key, so there is
nothing for it to assert on mount — and then call `.click()` on it, because only the element's real
activation behaviour toggles a checkbox and reaches the port's change path. A synthesised
`new Event('click')` toggles nothing; that is how this was measured wrong the first time, and the
correction is the reason the row above says "only after a real `.click()`".

That is the component performing a user interaction on a control no user can see, in order to tell a
library something it already knows. ADR-0028 §12 names it in advance:

> Building multiple against the existing shape would mean faking in the component what the port
> refused to fake, which is how a control that can never be selected gets shipped.

Text carriers need none of that theatre. The write is `setNativeValue` — already the component's
idiom, already dispatching the real `input` event every adapter listens for, and already what
`useCarrierSync` watches. The cost is moved to where this package says it belongs: a component that
must fake a user interaction to reach the port has found a gap in the port, exactly as an adapter
that needs the design system to change has.

So the port work is **a group whose members carry a `value` rather than a `checked`**, beside the
existing one. The ordering from ADR-0028 §12 is unchanged: port first, component second.

### 3. The row is declared, and multiple is what turns that from a nicety into a prerequisite

`Combobox` today takes four callbacks that all describe the same thing — how to read an item —
scattered and unaware of each other: `getKey`, `getLabel`, `renderItem`, `filter`. The cost of that
is already visible in this package's own story fixture, where `City` carries a `country`:
`renderItem` draws it, the reader sees "Italia" on three rows, types `Italia`, and finds nothing,
because the default filter can only see `getLabel`. **`renderItem` is a black box, so the filter
cannot see inside it.** It is the argument the filter already makes about accents, unchanged:

> a default that fails them looks to the reader like the record is not there

Declaring the row's shape — as the `Table` declares its columns, and for the reason written in
`ColumnShape`: _"Declared ONCE here rather than repeated on every cell — the same decision copied N
times, which this package already forbids"_ — buys filtering across every field marked searchable, an
accessible name composed from the declared parts rather than decided by accident by `renderItem`'s
markup, alignment without the consumer hand-writing a grid, and match highlighting.

And the one that makes it a **prerequisite** for this ADR rather than a separate improvement: **a
chip renders one part of a row, and `renderItem` cannot say which part.** With a black box a chip
either draws the entire rich row inside a token, or falls back to `getLabel` and is right by
accident. Multiple needs to know which field is the chip's.

**Opt-in, and it must buy something.** `getKey`/`getLabel` remain the whole API for a row that is a
line of text, which is most of them; the declaration appears when the row is structured. A mandatory
schema would tax the common case, and ADR-0028's own position is that the data is never ours — a
declaration is already a step toward owning the presentation, so it earns its place or it does not
ship.

It is also where a **group key** lives when grouping arrives, which is the other thing ADR-0028
deferred.

At enough richness the popup stops being a list and legitimately becomes a **grid** (`role="grid"`,
the documented combobox-with-grid-popup variant — the pattern behind an `@mention` autocomplete with
an avatar, a name and a handle in columns). Recorded here as reachable from a declared row shape, and
deliberately not chosen.

### 4. Not decided here

- **The chips' overflow policy** — wrap, scroll, or a "+N more" affordance.
- **Whether the elastic box is `InputGroup` or its own.** `InputGroup` is already "the chrome an
  `<input>` cannot carry beside it", which is precisely what chips are, and the single-select
  component just removed its own wrapper because `display: contents` is transparent to layout and
  **not** to selectors, so the field was not `.group > input` and none of the group's resets reached
  it. But `InputGroup` centres its children rather than stretching them, and what that does to chips
  on three lines has to be measured, not assumed.
- **The `role="grid"` popup**, per §3.
- **The states of data arriving** — loading, empty-because-fetching, error. ADR-0028 §13 stands
  unchanged.

## Consequences

- Two bound wrappers, `FormCombobox` and `FormMultiCombobox`, and **two rows** in the shared
  validation suite rather than one. That is the cost of the split, stated rather than discovered.
- ADR-0028 §4 is corrected (the carrier is a CSS-hidden text input, not `type="hidden"`) and §5 is
  revised (two components, not one with a mode).
- The port grows before the component does, which is ADR-0028 §12's ordering and is unchanged by any
  of this.
- The shared list layer is extracted **before** the second consumer exists, which is a deliberate
  exception to this package's "move a policy at the second copy" rule: the second copy is certain,
  and extracting afterwards would mean writing it twice on purpose.

## Evidence

The table in §2 is the output of a throwaway spike run in `apps/ui-ports-validation` under Chromium
in vitest browser mode. It is **not kept**: it asserts nothing, and a probe that asserts nothing is
not a test. What will hold these answers is the suite rows the ordering in §2 requires — the same
suite that caught the Formik defect ADR-0028 §12 cites, and the same one that caught, three days
later, a `FormCombobox` whose routing table a hand-written stub could not see.
