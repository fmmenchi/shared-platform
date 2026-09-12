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

Both keep `role="combobox"` — it is **one ARIA pattern**, which is why the split is two signatures
and not two components that happen to look alike.

**The shared layer owns the LIST and never the VALUE.** Three things must stay out of it, because
any one of them brings the rejected boolean back in through the basement: the cardinality of the
value, what the field displays, and whether activating a row closes the surface. The contract is
_"here are the rows, here is where you are, the user just activated spot X"_ — what activating
**means** belongs to the two components.

**What that layer actually is, stated narrowly, because the first attempt at this section was not.**
`useComboboxList` holds the filtering, the create **predicate**, and the highlight machine — the
`Spot` union, `move`, the clamp, and the rule that opening highlights nothing. Every line of it was
written after a review found a defect in it, which is the argument for extracting rather than
copying. It is **not** everything two combobox-shaped controls have in common, and an earlier draft
of this section listed seven things as though they were all in it. These are still to move, or still
to be written twice, and saying so here is cheaper than discovering it while building the second
component:

- the fold itself (`matches`/`says`), which today lives inside the single-select's own folder and is
  imported backwards by the primitive that needs it;
- `aria-setsize` / `aria-posinset`, written by hand at each row;
- the anchored surface, the popover command/mirror pair, and the coarse-pointer centring;
- the live region, **and its rule of counting `rows` rather than `shown`**, which was a defect once;
- the create **row** — its markup, its announcement, its activation — as opposed to its predicate;
- the keyboard mapping, including _"`Enter` belongs to the form until a row is highlighted"_, which
  is the very rule the hook's "start at `null`" state exists to protect and which currently lives in
  another file.

**And extracting early only pays if the contract is pinned early.** Measured on the first version of
the hook: 10 of 21 decisions in it could be deleted with the single-select's whole suite green,
including the render clamp whose own comment cites WCAG 4.1.2 — because the suite's helper resolves
`aria-activedescendant` to an element and therefore reads "points at nothing" and "points at an id
nothing carries" as the same `null`. A public documented prop, `filter` as a function, had no test
anywhere in the repo. A hook extracted for a second consumer, and covered only through the first
one's keystroke routes, hands that consumer exactly the "copying the absence of defects and hoping"
the extraction was meant to prevent. The hook owes a test of its own before the second component
starts, not after.

**Named `MultiCombobox`**, on `DateRangePicker`'s precedent: same family, different cardinality, its
own name rather than a flag. A flag would also force a discriminated overload on the public type
(`multiple: true` narrowing `value` to `string[]`), a signature that hides the fact that these are
two controls.

**A tag input is not a third component.** It is this one with `items={[]}`, `freeText` and
`onCreate`.

### 2. N values ride N hidden checkboxes, clicked rather than mounted checked — and the order is a known divergence

ADR-0028 §12 left this open and named what had to be proven: _"Multiple against a ref-based binding
[…] One field name, N carriers, a `register()` that hands over one ref per registration, and a
**count that changes as chips come and go**."_

**This section has now been wrong twice, and both corrections are kept in view because the pattern
is the finding.** A first spike measured only Formik and concluded "N text carriers, and a
value-shaped group in the port", rejecting checkboxes as the component _"faking a user interaction
on a control no user can see"_. A second measured react-hook-form — the binding §12 had actually
asked about — and reversed it. A third, adversarial, re-ran both with varied fixtures and found that
the reversal was right in direction and wrong in almost every supporting detail. What follows is the
third pass.

#### Text carriers are unusable, but not for the reason first given

Seven `defaultValues` fixtures, two text carriers seeded `"a"` and `"b"`, each `{...register('tags')}`:

| `defaultValues`     | DOM after mount | what the library holds |
| ------------------- | --------------- | ---------------------- |
| `{tags: []}`        | `["",""]`       | `[]`                   |
| `{tags: ['a']}`     | `["a","a"]`     | `["a"]`                |
| `{}`                | `["a","a"]`     | `"a"` (a string)       |
| none at all         | `["a","a"]`     | `"a"` (a string)       |
| `{tags: ['a','b']}` | `["a,b","a,b"]` | `["a","b"]`            |

The mechanism is **not** blanking. `register` writes the field's value onto **every node it is
handed**, stringified — `String([])` is `""`, which is the only reason the first measurement looked
like erasure, and `String(['a','b'])` is the literal `"a,b"`, which is the giveaway. With no
`defaultValues` at all nothing is blanked and the field simply holds a **string**.

The conclusion survives and is stronger than the sentence that used to carry it: **in every fixture,
N text carriers under one `register` collapse to one value, and the second key is unrecoverable.**
The option is closed. But it is closed by "one name, one value", not by erasure.

#### Checkboxes work — mounted bare and then clicked, never mounted checked

The previous draft's table said "mounted checked" in its header and "after a real `.click()`" in one
of its cells. Those are mutually exclusive: mount checked **and** click and you have unchecked it —
measured, `FormData` empty. And through the real ports the choice is not even available:

| library         | what `option(value)` returns                           |
| --------------- | ------------------------------------------------------ |
| react-hook-form | `name, onChange, onBlur, ref, value`                   |
| Formik          | `name, value, **checked**, onChange, onBlur`           |
| TanStack        | `name, value, **checked**, onChange, onBlur`           |
| Conform         | `id, name, form, key, type, **defaultChecked**, value` |
| React 19        | `name, value`                                          |

Formik and TanStack return a **controlled** `checked`, so a `defaultChecked` the component adds is
ignored: measured through the real port, two carriers in the document, **none checked, `FormData`
empty**. Conform returns `defaultChecked`. React 19 returns neither.

**So the contract is: mount the carrier bare, then activate it.** `.click()` and nothing else — the
element's real activation behaviour is the only thing that toggles a checkbox and reaches the port's
change path, and a synthesised `new Event('click')` toggles nothing. That is the one strategy that
works across all five, and the component absorbs the four different answers to "is this carrier
checked" rather than the port growing a member for them.

#### The order is a known divergence, and it lands on exactly this component

| how the carrier arrives | react-hook-form holds | `FormData` says   |
| ----------------------- | --------------------- | ----------------- |
| appended at the tail    | `["b","c"]`           | `["b","c"]` ✓     |
| inserted at the head    | `["b","a"]`           | `["a","b"]` ✗     |
| removed, then re-added  | `["b","c","a"]`       | `["a","b","c"]` ✗ |

The controlled adapters get it right, because `checkedInGroup` reads `form.elements` in document
order. react-hook-form reads its own append-ordered `_f.refs`, and `field-type.ts` already says so
in writing:

> For a static option list — every list this package has shipped so far — the two coincide […] For a
> list that changes, they do not, and the fix is not ours to write: it is how that library reads a
> group.

**A `MultiCombobox` is by definition a list that changes.** The previous draft concluded "the port
does not change at all, the component is the whole of the work" while the port's own source
predicted the opposite for this precise case. The divergence is **accepted and named**, not fixed:
it is one library's reading of a group, the DS cannot reach it, and a consumer who needs order to
agree across libraries must read `FormData`. It goes in the shared suite as a documented divergence
so it is not rediscovered.

#### Removal: uncheck in the same batch as the unmount

Unmounting is not a change, so a chip taken away leaves a library holding it — measured
`["a","b","c"]` after a removal, against `["a","b"]` in `FormData`. Unchecking the carrier repairs
it, in every position: removing the first of three, and two in one tick, both come out right.

The rule is **"uncheck at all, in the same batch as the unmount"**, not "before it". React's
automatic batching means the natural way to write it — `setKeys(...)` and `.click()` in one
handler — is safe, because the node is still live when the click runs. It breaks only when the
unmount is genuinely flushed first, which in practice means `flushSync`. An earlier draft warned
against the safe formulation and said nothing about the one that bites.

#### Reset: which reset

The platform's own `form.reset()` **is** a no-op on a set React mounted, in both shapes, and that is
the §4 defect one level up: each control's default is whatever React mounted it with, so the
platform restores every one to itself, and the number of them is React state the platform cannot
reach. **The component owns reset.**

A library's own `reset()` is a different event and is **not** a no-op. react-hook-form's opens a
window in which the library holds `[]` while the DOM still submits everything — a reset followed by
a submit in the same interaction posts the full list. It self-heals within a tick, which is worse
than failing, because it will not reproduce under a slow reader.

#### Two edges to hold, both in the port's existing behaviour

- **Carriers outside a `<form>`** fall through `checkedInGroup`'s `form == null` branch to
  `toggleOption`, which appends in **tick order** rather than document order — measured
  `["t0","head"]` where the document says `["head","t0"]`. A combobox is not always inside a form.
- **A disabled carrier is dropped from the group permanently.** A pre-selected, disabled option plus
  one further click leaves the library holding only the clicked one — not merely omitted from
  submission, gone from state. Consistent with `FormData` and with the documented decision, so not a
  bug; but a `MultiCombobox` that disables carriers (a maximum-selection lock) loses data on the next
  click, and must not disable them.

#### Still not measured, and named as such

A library writing a selection **back** into the group. `setValue('tags', ['a'])` reaches the DOM and
not the component's React state, so the submitted list and the visible chips disagree. The
single-select answers this with `useCarrierSync`'s wrapped `value` descriptor; whether that
generalises to N carriers is a design assertion in this document and nothing more. It is the first
thing the component's suite must prove.

### 3. The row is declared, the selection lives outside, and creation requires both

`Combobox` today takes four callbacks that all describe the same thing — how to read an item —
scattered and unaware of each other: `getKey`, `getLabel`, `renderItem`, `filter`. The cost is
already visible in this package's own story fixture, where `City` carries a `country`: `renderItem`
draws it, the reader sees "Italia" on three rows, types `Italia`, and finds nothing, because the
default filter can only see `getLabel`. **`renderItem` is a black box, so the filter cannot see
inside it.** It is the argument the filter already makes about accents, unchanged:

> a default that fails them looks to the reader like the record is not there

Declaring the row's shape — as the `Table` declares its columns, and for the reason written in
`ColumnShape`: _"Declared ONCE here rather than repeated on every cell — the same decision copied N
times, which this package already forbids"_ — buys filtering across every field marked searchable,
an accessible name composed from the declared parts rather than decided by accident by
`renderItem`'s markup, alignment without the consumer hand-writing a grid, and match highlighting.

And the one that makes it a **prerequisite** for this ADR rather than a separate improvement: **a
chip renders one part of a row, and `renderItem` cannot say which part.** With a black box a chip
either draws the entire rich row inside a token, or falls back to `getLabel` and is right by
accident.

**Opt-in, and it must buy something.** `getKey`/`getLabel` remain the whole API for a row that is a
line of text, which is most of them; the declaration appears when the row is structured. A mandatory
schema would tax the common case, and ADR-0028's own position is that the data is never ours.

It is also where a **group key** lives when grouping arrives, which is the other thing ADR-0028
deferred.

**The selection lives outside the component**, in a composable hook, the way `useTableSort` and
`useTableFilters` hold a table's. That is where the mechanics §2 measured belong — the ordered key
list, add and remove, the removal ordering, the per-library carrier props — because inside a
component they are reachable only by rendering one, and outside they are a surface a test can hold
directly. Both components keep controlled and uncontrolled selection for the simple case; the hook
is what a consumer reaches for when the selection has rules of its own (a maximum, a dedup, a
default set).

**Creation requires the selection to be outside, and that is a simplification rather than a
restriction.** Creating already forces the consumer to own `items` — there is no other way for the
new row to appear — and a consumer who owns the list but not the selection is a halfway house.
With the selection outside, `onCreate` returns to what ADR-0028 §6 said it was: the component
reports the intent, and the consumer does the two things it already owns, appending the item and
selecting the key.

Two things the single-select needed today disappear with it: the _"return the new key from
`onCreate` to adopt it"_ contract, and the development warning for when nothing is returned. Both
exist only because the component holds the selection and must therefore adopt a key for a row that
does not exist yet. The awkward intermediate state — a key chosen before its row arrives — stops
existing rather than being handled.

So: **`onCreate` implies the selection props**, expressed as a discriminated union on the props so
the mistake is a compile error rather than a runtime warning — the same idiom
`@fmmenchi/ui-form-ports` uses for field names, _"the mistake is a compile error rather than a
silent widening"_. Uncontrolled **plus** creation stops being a combination that exists; uncontrolled
without creation is untouched. Nothing that worked is removed: that combination is exactly the one
the single-select had to cover with a warning because it could not be repaired from anywhere.

### 4. The `Table`'s model, above the API line and not below it

The two controls share a shape, and it is worth writing down once rather than restating in each:
**the data is the consumer's, the structure is declared once, the state lives in composable hooks,
and a declared affordance is not a behaviour** — `sortable` puts a button in a header and lets
`aria-sort` land there while what sorting _means_ arrives through `useTableSort`; `onCreate` offers a
row while what creating _means_ is the consumer's. Both warn when an affordance is declared with
nothing wired to it. There is already one shared artifact: `ComboboxFilter` documents itself as
_"the same shape the table's column filters take (`RowFilter`), reused rather than restated"_.

**The analogy is about the API's shape and stops there.** Four things are the combobox's alone, and
a shared abstraction would have to know about all of them:

1. **It has a value a form submits.** A table renders; it never submits. The whole of §2 — carriers,
   `form.reset()`, per-library binding — has no table counterpart. The failure modes differ too: a
   lost sort is a lost view, a lost selection is lost input.
2. **It can mint a row the data does not have.** A table never invents one, which is why "who owns
   the new item" is a question only this side has to answer.
3. **Its list is an ephemeral surface** — open and closed, top layer, anchored, light-dismissed, a
   different shape under a finger. A table is simply there.
4. **Focus never enters the list.** `aria-activedescendant` rather than real focus, which is why the
   highlight is state with no DOM home and why every defect found in it was of that family.

And one that reads as the same and is not: **the declared structure.** A table's columns are
orthogonal to its rows, authored at build time, and never move under the cursor; a combobox's
declaration describes the parts of an item, and the items arrive from a server while the user is
typing. Same word, opposite stability — which is the class the clamp and the `Spot` union exist to
close.

Written here rather than in an ADR of its own: two consumers is this package's threshold for moving
a policy, not for making general doctrine. If a third data-driven surface appears, this section is
what gets extracted.

### 5. Not decided here

- **The chips' overflow policy** — wrap, scroll, or a "+N more" affordance.
- **Whether the elastic box is `InputGroup` or its own.** `InputGroup` is already "the chrome an
  `<input>` cannot carry beside it", which is precisely what chips are, and the single-select
  component just removed its own wrapper because `display: contents` is transparent to layout and
  **not** to selectors. But `InputGroup` centres its children rather than stretching them, and what
  that does to chips on three lines has to be measured, not assumed.
- **The `role="grid"` popup.** At enough richness a declared row makes the popup legitimately a grid
  — the documented combobox-with-grid-popup variant, the pattern behind an `@mention` autocomplete.
  Reachable, not chosen.
- **The states of data arriving** — loading, empty-because-fetching, error. ADR-0028 §13 stands.

## Consequences

- Two bound wrappers, `FormCombobox` and `FormMultiCombobox`, and **two rows** in the shared
  validation suite rather than one. That is the cost of the split, stated rather than discovered.
- ADR-0028 §4 is corrected (the single-select carrier is a CSS-hidden text input, not
  `type="hidden"`) and §5 is revised (two components, not one with a mode).
- **ADR-0028 §12's ordering falls away.** It made port-level work the prerequisite for multiple;
  §2 says there is none. The component absorbs the per-library differences instead, and the price of
  that is written into §2 rather than into an adapter.
- The single-select carrier is a **text** input and the multiple one is a **checkbox**. Each is the
  only shape its cardinality can use, and the divergence has to be documented where a reader meets
  it, not only here.
- **One accepted divergence ships with the component**: react-hook-form's group order against
  `FormData`'s, for a list whose rows are inserted anywhere but the tail.
- The shared list layer is extracted **before** the second consumer exists — a deliberate exception
  to "move a policy at the second copy" — and §1 now states how much of the shared surface it
  actually covers.

## Evidence

The tables in §2 are the output of throwaway spikes run in `apps/ui-ports-validation` under Chromium
in vitest browser mode, across three passes: one library, then the binding ADR-0028 asked for, then
an adversarial re-run with varied fixtures. They are **not kept** — a probe that asserts nothing is
not a test. What holds these answers is a row in the shared validation suite, the same suite that
caught the Formik defect ADR-0028 §12 cites and, days later, a `FormCombobox` whose routing table a
hand-written stub could not see.

The three passes are the reason this section reads as it does. The first measured one library and
produced a decision with a principled argument attached. The second measured a second library and
reversed the decision. The third varied the fixtures and found the reversal right in direction and
wrong in its mechanism, its table, its ordering rule and its claim about reset. **A partial
measurement with a good argument on top of it is more convincing than no measurement, and no more
correct** — three times over, in one section, on the same question.
