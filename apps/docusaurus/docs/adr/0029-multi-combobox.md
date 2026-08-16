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

### 2. N values ride N hidden checkboxes, the port does not change, and the removal ordering is the contract

ADR-0028 §12 left this open and named the two things that had to be proven: _"Multiple against a
ref-based binding […] One field name, N carriers, a `register()` that hands over one ref per
registration, and a **count that changes as chips come and go**."_

**This section reached the opposite conclusion first, on partial evidence, and the correction is
left in view because it is the point.** A first spike measured only Formik — a controlled library —
and concluded "N text carriers, and a value-shaped group in the port", rejecting checkboxes as the
component _"faking a user interaction on a control no user can see"_. Then the ref-based binding
§12 actually asked for was measured, and it refuted the decision outright.

Throwaway spikes in `apps/ui-ports-validation`, Chromium, with the selection held in React state and
carriers mounted and unmounted as it changes:

|                                        | N text inputs                 | N hidden checkboxes, mounted checked |
| -------------------------------------- | ----------------------------- | ------------------------------------ |
| `FormData.getAll(name)`                | `["a","b"]`                   | `["a","b"]`                          |
| Formik, through the merged option port | `[]`                          | `["b"]` — after a real `.click()`    |
| react-hook-form, one carrier           | holds `[]`, **DOM `[""]`**    | holds `["a"]`                        |
| react-hook-form, two carriers          | holds `[]`, **DOM `["",""]`** | holds `["a","b"]`                    |
| react-hook-form, a chip removed        | —                             | holds `["a","b"]` — **stale**        |
| …unchecked first, then unmounted       | —                             | holds `["a"]` ✓                      |
| `form.reset()` on a set React mounted  | **no-op**                     | **no-op**                            |

**Text carriers are not merely invisible to a ref-based binding, they are destroyed by it.**
react-hook-form holds `[]` however many are mounted — and `FormData` reads `[""]`, because
`register()` writes the field's value onto the node it is given and the field's value is a list.
The carriers are blanked in the DOM by the library that cannot read them. That is worse than the
Formik result, and it removes the option entirely.

**Checkboxes work, and the `.click()` is not theatre — it is the only lever that exists.** It is
what a controlled library needs to learn a selection, and what a ref-based one needs, in both
directions. The earlier rejection weighed an aesthetic argument against evidence from one library
and lost; ADR-0028 §12's warning about "faking what the port refused to fake" is about something
else — the port refused to put an option's **value** in a map keyed by field name, which the
one-name-to-many-controls shape solved. Activating a real control is not that.

**The removal ordering is part of the contract, not an implementation detail.** Unmounting is not a
change, so a library that holds its own state keeps the removed key — measured, `["a","b"]` after a
chip was taken away. The component must **uncheck the carrier and let that be heard, then unmount
it**. In that order it is `["a"]`. Written down here because the reverse order is the natural way to
write the code and is silently wrong.

**So the port does not change at all.** `UseFormOptionField` and `checkedInGroup` — merged for radio
groups and checkbox groups — already answer this, which reverses ADR-0028 §12's ordering
("port-level work first"): there is no port-level work. The prerequisite it named turned out to be
satisfied by the shape that landed for the other customer.

**`form.reset()` is a no-op on a set React mounted, in both shapes.** This survives the reversal
unchanged, and it is the `type="hidden"` defect from §4 one level up, for the same reason: each
control's default is whatever React mounted it with, so the platform restores every one to itself,
and the _number_ of them is React state the platform cannot reach. **The component owns reset.**
`useCarrierSync` already listens for the event; multiple generalises its seed from one key to a list.

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
- ADR-0028 §4 is corrected (the single-select carrier is a CSS-hidden text input, not
  `type="hidden"`) and §5 is revised (two components, not one with a mode).
- **ADR-0028 §12's ordering falls away**: it made port-level work the prerequisite for multiple, and
  the measurement in §2 says there is none — the one-name-to-many-controls shape that landed for
  radio and checkbox groups already answers this. The component is the whole of the work.
- The single-select carrier is a **text** input and the multiple one is a **checkbox**, which is a
  divergence inside one family and has to be documented where a reader meets it rather than only
  here. Each is the only shape its cardinality can use: one value that a form must reset to a seed,
  against N values a library must be able to hear appear and disappear.
- The shared list layer is extracted **before** the second consumer exists, which is a deliberate
  exception to this package's "move a policy at the second copy" rule: the second copy is certain,
  and extracting afterwards would mean writing it twice on purpose.

## Evidence

The table in §2 is the output of two throwaway spikes run in `apps/ui-ports-validation` under
Chromium in vitest browser mode. They are **not kept**: they assert nothing, and a probe that
asserts nothing is not a test. What will hold these answers is a row in the shared validation
suite — the same suite that caught the Formik defect ADR-0028 §12 cites, and the same one that
caught, days later, a `FormCombobox` whose routing table a hand-written stub could not see.

The two spikes are also why this section carries its own reversal rather than reading as though the
answer were obvious. The first measured one library and produced a decision with a principled
argument attached to it; the second measured the library ADR-0028 had explicitly asked about and
showed the decision was wrong, the principle was aimed at the wrong target, and the rejected option
was the only one that works. A partial measurement with a good argument on top of it is more
convincing than no measurement, and no more correct.
