# ADR 0028 — Combobox: the first control we draw ourselves, and what that costs

- **Status:** proposed (2026-08-15)
- **Date:** 2026-08-15
- **Deciders:** Fabio Menchicchi

> Takes a deliberate, scoped exception to [ADR-0013](./0013-form-controls-contract.md), which is in
> force and says every form control is a transparent native element. That decision is **not**
> reversed: it keeps governing `Input`, `Select`, `Textarea`, `Checkbox`, `Radio`, `Switch` and
> `Slider`. This ADR authorises exactly one component to leave it, states what replaces the
> guarantee, and names the price.

## Context and problem statement

`Combobox` has sat under **Deferred** on the component roadmap since the roadmap existed, with a
reason worth quoting because it is still half true:

> Not an oversight — the trade is written into `Select`: the box is ours and the list is the
> browser's, because _"a themed list is what a combobox costs weeks for"_. Building one reverses
> that trade, so it needs an ADR before it needs code, and `appearance: base-select` may make part
> of it unnecessary.

Two things have changed, and one of them was true all along and unnoticed.

**The library already refuses work by pointing at a component that does not exist.** Not once —
four times, in the shipped source and docs of `Select`:

| Where                     | What it says                                                                            |
| ------------------------- | --------------------------------------------------------------------------------------- |
| `select.component.tsx:22` | _"no `multiple` — a fieldset of checkboxes for a few options, **a combobox for many**"_ |
| `select.mdx:59`           | several options, many → **a combobox with chips**                                       |
| `select.mdx:60`           | search inside the options → **a combobox**                                              |
| `select.mdx:61`           | icons or rich rows → **a combobox**                                                     |

The roadmap's own **Next** section states that _"nothing in the tree currently defers a decision to
a component that does not exist"_. That is false, and `Select` is where it is false. A consumer who
needs multi-select, search or rich rows is today sent — by our documentation, in a table — to
nothing at all. Under the roadmap's own ordering rules this is the **strongest** of the three
reasons to build something: a written contract waiting on a component.

**`appearance: base-select` answers a smaller question than the deferral assumed.** Verified
2026-08-15: it ships in Chromium (Chrome/Edge 134+), Firefox has an open implementation bug
(bugzilla 1958445), WebKit is in progress, and it is **not Baseline**. `Select` already carries a
full `@supports (appearance: base-select)` branch that themes `::picker(select)`, `option`,
`optgroup`, `::picker-icon` and `::checkmark` — the experiment has been run, in this repo, and it
works where the engine has it.

What that branch proves is precisely the limit: it makes a `<select>`'s **list** ours to paint. It
cannot give a `<select>` a search field, free text, a create affordance, chips, or rows with two
lines and an avatar. So `base-select` retires **one** of the original motivations — "the themed
list is what costs weeks" — and leaves every other one standing. It also, usefully, fixes the
visual target: where the engine supports it, `Select` and `Combobox` should be indistinguishable
while open, and the CSS for that already exists and is already measured.

What remains is the real question this ADR has to answer: **what does the design system take on
when it stops handing a control to the platform and draws one itself?**

## Decision drivers

- **The data is not ours.** The same rule `Select` follows and the `Table` follows: the consumer
  owns the items, the fetching, the ordering and the meaning of a match.
- **A written contract is waiting.** Four documented refusals point here.
- **Native-first is a rule about capability, not a superstition.** Where a native element does the
  job we use it (ADR-0002). No native element does search + creation + chips + rich rows, and that
  absence is the justification — not a preference for our own widget.
- **Whatever we draw, we owe.** Focus, keyboard, announcements, the mobile shape, forced colors: the
  platform stops providing them the moment we stop using its element.
- **One look, not two.** A control that sits beside `Input` and `Select` in the same form and does
  not match them reads as a different system (the reason `control-base` exists).

## Options considered before drawing one ourselves

"No native element does this" is the entire justification, so it has to survive being checked rather
than asserted.

**`<input list>` + `<datalist>` — the native shell, and it is real.** It gives a text field, a filter
the browser applies as you type, free text, and a value that submits through `FormData` with no
JavaScript at all. For _one value out of many plain strings, with typing_, it **is** the answer, and
it is the option this ADR has to reject out loud rather than walk past.

Rejected because its limits are structural, not cosmetic: the list is drawn by the OS and is **less**
styleable than a `<select>`'s — there is no `::picker()` equivalent for it and no `base-select` on
any standards track that reaches it; its options are strings, so there are no rows, no avatars, no
two-line entries; there is no `multiple`, so there are no chips; there is no grouping; and its
keyboard and screen-reader behaviour is the least consistent of any form control across engines,
which is precisely the kind of thing a design system exists to stop each consumer discovering alone.

Worth writing down for later: where a consumer needs only that narrow case, `<input list>` stays the
better answer and costs them nothing from us. This ADR does not claim `Combobox` replaces it.

**A server-rendered `<select>`, upgraded on hydration.** A genuine progressive-enhancement route:
without JavaScript the reader gets a native select carrying every option; with it, the combobox
takes over. Rejected as a requirement, not as an idea. It obliges the document to contain the whole
option set — the one thing that is impossible in the cases this component exists for, a list that is
thousands long or fetched from a query the reader is still typing. A no-JS story that only works
when the list is small is a way of saying "use `Select`", which the table in 1 already says outright.
Nothing stops a consumer building it themselves over this component; the DS does not build it in.

**So the exception is forced by the feature set, and only by it.** For one-of-many plain strings the
platform has an answer and we are not it. For search **and** multiple **and** chips **and** rows
**and** creation together, there is no native element and no no-JavaScript route. Choosing this
component is choosing those features and paying that price; a consumer who needs fewer of them has
two cheaper doors above, and the docs must send them there.

## Decision

### 1. What it is, and what stays `Select`'s

A `Combobox` is a **text field the user types into, plus a listbox we render**, for choosing one or
several items out of many. `Select` does not change and does not become a special case of it.

| The question                            | The answer               |
| --------------------------------------- | ------------------------ |
| one of a few, plain options             | `Select`                 |
| a few, several of them                  | `Fieldset` of `Checkbox` |
| one of many, needing search             | `Combobox`               |
| several of many, with chips             | `Combobox`               |
| options that are rows, not strings      | `Combobox`               |
| a value that may not be in the list yet | `Combobox`               |

`Select` keeps its trade and keeps the OS picker on a phone. Choosing `Combobox` is choosing to
give that up, and the docs say so where the consumer chooses.

### 2. The data is not ours; the component is a pipeline over it

The consumer passes items of their own shape `T`. The component never fetches, never sorts, never
caches, and never decides what a match means. The stages, each replaceable:

```
items → filter(query) → group → highlight → select | create
```

- **The predicate is the existing type.** `RowFilter<T> = (row: T, value: string) => boolean` from
  `src/filtering/` is exactly a combobox's question, and it is reused rather than restated. The DS
  ships a plain substring default over a consumer-supplied label; anything else is theirs.
- **`FilterState` is NOT reused.** It is `Record<string, string>` — one filter per COLUMN, a table's
  shape. A combobox has one query. Reusing it would import a shape that means nothing here for the
  sake of the word "filter".
- **Filtering must be switchable off, and this is not a convenience.** When the consumer searches on
  a server, the items arriving are already the answer. A component that filters them again applies
  the query twice, and the second pass silently drops every row whose match the server understood
  and the client's default does not — fuzzy matches, synonyms, accent folding. The bug looks like
  "the server returns results and the list is empty". Externalising the stage is the fix.

### 3. Controlled **and** uncontrolled, on every axis

Both, on each of the three axes, through the existing `useControlled` primitive — never one or the
other:

| Axis            | Controlled | Uncontrolled   | Reported by     |
| --------------- | ---------- | -------------- | --------------- |
| selection       | `value`    | `defaultValue` | `onValueChange` |
| the typed query | `query`    | `defaultQuery` | `onQueryChange` |
| the popup       | `open`     | `defaultOpen`  | `onOpenChange`  |

This is the rule the rest of the package already follows — `Select` has it for free, being a native
`<select>` where React supplies `value`/`defaultValue` itself — and a self-drawn control does not
get to be the exception. It is also what `useControlled` exists for, and the memory attached to that
primitive is the constraint: use it **where WE draw the control**, which is exactly here.

The consumer may still hold everything and drive it fully, `Table`-style; that is the controlled
mode, and `use*` hooks are offered for the parts worth pre-writing. What changes from the earlier
draft of this decision is that holding it is not **required**.

**What uncontrolled obliges, and it is the expensive half.** The hidden carrier (4) is a real DOM
node, so a value can arrive from three doors, and `DateInput` has already measured all three and
paid for them:

1. **The component's own path** — a selection or a keystroke. Reports for itself.
2. **A programmatic assignment onto the carrier.** A form library's `setValue`/`reset` writes
   straight onto the element its `register()` ref was given. That fires no event, records no
   mutation and triggers no render, so no effect can catch it — the only thing that sees an
   assignment is the property being assigned to. `set-native-value.ts` and the descriptor-wrapping
   discipline in `date-input.component.tsx` are the answer, and they are reused rather than
   re-derived.
3. **`form.reset()`**, which takes neither of the first two doors. It fires on every control in the
   form, touched or not — so a reset must be followed **only when the value actually moved**, or an
   untouched field re-announces what it already held on every click of a reset button (measured, and
   it turned into a call to the consumer each time).

A `Combobox` that is uncontrolled and does not follow all three shows the user one selection while
the form submits another. That is the failure mode, it is not hypothetical, and this component
inherits the solution instead of writing a fourth one.

### 4. It participates in forms through a hidden native carrier — the exception to ADR-0013

> **Revised by [ADR-0029](./0029-multi-combobox.md) §2.** The carrier is a CSS-hidden, focusable
> **text** input, not `<input type="hidden">`: measured, a hidden input is in value mode "default",
> so `form.reset()` restores its current value onto itself and the field comes back holding the
> choice that was just discarded. The exception this section authorises is unchanged.

ADR-0013's guarantee is not styling: it is that the browser itself collects the form. A `<select>`
submits with `FormData` with no JavaScript running at all. The visible `<input>` of a combobox holds
the **query** ("mil"), not the value ("42"), so without something else the form would carry the
search string.

**The component renders a hidden native carrier**: `<input type="hidden">` with the field's `name`,
one per selected item when multiple — the same idiom the platform uses for checkboxes sharing a
name, so `FormData.getAll()` returns them. This restores everything that reads the DOM: `FormData`,
the `Form*` adapters, and `form.reset()` — a hidden input has a default value, and the carrier being
the DOM fact is what keeps the reset honest. Following it back into the component's own state is the
third door in 3, and it is the reason that section is not a formality.

**The price, stated rather than discovered later: this is the first control in the design system
that does not work without JavaScript.** With the bundle unloaded there is no list, no filtering and
no selection — only whatever the server rendered into the carrier. That is the whole of the
exception, it applies to this component alone, and it is why this ADR exists rather than a folder.

### 5. Single and multiple, with chips — and `Selection` is not reused

> **Revised by [ADR-0029](./0029-multi-combobox.md) §1.** Both still ship, but as **two components
> over a shared list layer** rather than one component with a mode — the difference between them is
> not the cardinality of the value, it is the box: a fixed-height control against an elastic
> container. The decision about `Selection` below is unchanged and still in force.

Both ship. Multiple is not a later addition: `select.mdx` promises "a combobox with chips" in a
table a consumer reads while choosing.

Selection is an **ordered list of keys**, not the existing `Selection { mode: 'include' | 'exclude',
ids }`. That type exists to express "ten thousand rows except these three" for a paginated table
whose ids are not on the client. A combobox's user picks items one at a time out of a list they can
see; `exclude` has no meaning, order is visible (the chips are in it), and inheriting the shape
would put a mode nobody can reach into an app's state and a request body.

### 6. Creation is an item in the list; free text is an option of the package

The create affordance is **a row in the listbox**, not a button beside it. One keyboard path, one
highlight, one announcement, no second code path to keep in step — the same reason the DS refuses
slot elements that exist only to hold a few declarations (ADR-0016).

The consumer decides when it appears (typically: the query is non-empty and matches nothing exactly)
and what it produces; the component only reports the intent.

**Accepting free text is opt-in, off by default.** Off, the field is a chooser: what it submits is
always a key from the list, and `aria-autocomplete="list"`. On, the typed string is itself a
possible value. Off-by-default because the failure mode of the wrong default is silent — a form that
happily submits a typo as if it were a record.

No inline completion (`aria-autocomplete="both"`) in either mode: it fights creation, and it fights
IME composition, where the engine is already writing into the field.

### 7. The look is shared, not re-derived — and the extraction happens here

The closed control must be `Input`'s box to the pixel, and where `base-select` exists the open list
must be `Select`'s picker. Today `Input` and `Select` each restate that box: `rounded-md border
px-3`, the `bg-input` / `text-input-foreground` / `border-input-border` roles, the focus ring, the
`[aria-invalid='true']` weight cue, the `:disabled` treatment, the 32/36/44 sizes, the
`(pointer: coarse)` bump and the `forced-colors` block — **two copies, comment for comment**.

`Combobox` would be the third, and this package's own rule is that two consumers is when a policy
moves. It has already been paid for once: `NavGroup` hand-rolled the first two lines of the button
and shipped with no focus ring at all, invisible to every test because the test page has no
Preflight.

So the shared parts move into `styles/utilities.css`, beside `control-base` and `anchored-arrow`
which are there for exactly this reason, and `Input`, `Select` and `Combobox` all `@apply` them.
This is a refactor of two shipped components and is part of this work, not a follow-up.

The visible consequence is worth naming: where `base-select` is supported, `Select` and `Combobox`
will look alike open and closed. Where it is not, `Select` keeps the OS list — which `select.mdx`
already warns about in the sentence "a `Select` and a future combobox will not look alike while
open".

### 8. Under a finger it centres, by the mechanism that already exists

The listbox is an anchored surface (ADR-0021), and under `(pointer: coarse)` it becomes a centred
surface — the same shape change `DatePicker` already makes, for the same reason and by the same
CSS-only route: the same `<dialog popover>` in the top layer, still light-dismissed by the platform,
still not modal, with `inset: 0; margin: auto` and the width cap lifted. No `matchMedia`, no second
component, no JavaScript branch that can disagree with the stylesheet.

Anchoring cannot hold a list whose rows are sized for a finger, and the 44px rule is not negotiable
for a control (WCAG 2.5.8). This is inherited from the existing rule, not re-derived beside it.

### 9. The accessibility contract

ARIA 1.2's combobox pattern, and it differs from what the rest of this package does:

- The input keeps `role="combobox"`, `aria-expanded`, `aria-controls`, and points at the active row
  with **`aria-activedescendant`**. **Focus never leaves the input** — so `roving.ts`, which `Menu`,
  `Tabs` and `Toolbar` use, does **not** apply here. `useDescendants` still does, for registration
  and ordering.
- **The result count is announced from a live region.** Filtering a list is otherwise silent: the
  rows change and a screen-reader user is told nothing. This is why the live region is not optional.
- The chips are removable, each with its own accessible name, and removal is reachable from the
  keyboard without a mouse.
- Forced colors: the row treatments the `base-select` branch already answers for (`Highlight` /
  `HighlightText` for the selected row) apply here identically, because they will be the same rules.

### 10. Virtualisation is a seam, not an engine

Windowing is opt-in, and the design system **does not ship a virtualiser**: no windowing runtime, no
new dependency, no measurement loop. The consumer brings theirs and the component exposes the seam.

What the DS keeps is the part that is ours and that a naive virtualised listbox always gets wrong:
`aria-setsize` and `aria-posinset` on every rendered row, so a list holding 20 of 5 000 options
tells the truth about how many there are and where you are. A virtualised listbox without them
announces "1 of 20" over and over while the user walks thousands of records.

### 11. Groups are part of the pipeline

Grouped output is a stage, rendered with the same treatment `optgroup` already gets in the
`base-select` branch: a heading that is not an option, skipped by the keyboard, counted out of
`aria-setsize`.

### 12. What this obliges the form bindings, including one thing nobody has proven

`@fmmenchi/ui-form-ports` ships five bindings — `conform`, `formik`, `react-19`, `react-hook-form`,
`tanstack` — and they come in two shapes the date family already paid to learn:

- **Ref-based** (`react-hook-form`'s `register`, Conform's `getInputProps`): hands over a `ref` and
  writes the DOM node itself. This is the shape the carrier in 4 serves directly, and it is why the
  three doors in 3 exist.
- **Controlled** (`formik`, `tanstack`): hands over `value` and `onChange` and **no ref at all**,
  expecting the value to be rendered back.

For `react-19` the carrier is not a detail, it is the whole binding: a form action receives
`FormData` the browser builds from the DOM, so a control that keeps its value only in React submits
nothing.

The controlled shape needs a bridge, and there is one — `useBoundCarrier`, written for exactly this
when the date family got it wrong. The failure was measured, not imagined: Formik's `setFieldValue`
updated a `FormInput` beside the date field and left the field itself stale, so `FormData` posted
one date while the library held another, and clearing did nothing at all. A `Combobox` binding that
skips this repeats it.

**The port already carries half of this, and already refuses the other half in writing.**

`field-type.ts` is the shared layer above all five bindings: a map of field name → control kind,
plus `readValue`, which undoes the DOM's "everything is a string" in one place (`checked` for
booleans, `valueAsNumber` for numbers, `undefined` rather than `NaN` because that is what "no value
yet" means to a schema). Single-select is a small, well-understood extension of it — `'combobox'`
joins `FormFieldType` the way `'select'` and `'textarea'` did, and those were added for a measured
defect rather than for tidiness: without a member for it, Conform shaped a select through
`getInputProps` and emitted `type`, `pattern`, `accept` and `multiple` onto it, and `multiple`
flipped the element's role to `listbox`. Adding the member is what stops a library mis-shaping a
control it does not recognise, and it fixes all five bindings at once. A combobox whose keys are
numeric ids then inherits `readValue`'s coercion instead of every consumer's schema doing it.

**Multiple, on the other hand, needs a port shape that does not exist — and the port says so
itself.** `FormFieldType` deliberately has no `radio` member, with this reason recorded in its
source:

> A radio group is N controls sharing one name with a distinct value each, so the option's value —
> the thing the binding turns on — cannot be expressed in a map keyed by field NAME. Advertising it
> would have meant a control that can never be selected […] That binding needs its own shape, one
> name to many controls, and it does not exist yet.

A multi-select combobox is exactly that shape: one `name`, N carriers, a distinct value each. So the
prerequisite for multiple is not a test, it is a **port-level piece of work** — and it now has **two
customers**, radio groups being the first, which is this package's own threshold for when an
abstraction earns its place. It stayed unbuilt because one customer was not enough reason.

That ordering is the decision: `'combobox'` in `FormFieldType` first, single-select binds; the
one-name-to-many-controls shape next, and multiple binds on top of it. Building multiple against the
existing shape would mean faking in the component what the port refused to fake, which is how a
control that can never be selected gets shipped.

Then, in `apps/ui-ports-validation` — the shared suite that caught the Formik defect above — two
things are proven **before** the component ships:

1. **Multiple against a ref-based binding**, once the port shape exists. One field name, N carriers,
   a `register()` that hands over one ref per registration, and a count that changes as chips come
   and go. If a binding still cannot express it, multiple binds through that library's controlled
   API and the carriers stay for `FormData` and the no-JS remainder — a fallback chosen deliberately,
   not discovered by a consumer.
2. **Creation changes what the bound value IS.** With free text on, what the library holds may be a
   key from the list or a draft that has no key yet. A validation schema cannot discriminate between
   them unless the shape says which it is, so the value the adapter reports must carry that
   distinction rather than flattening both to a string.

And `@fmmenchi/ui` stays out of all of it: `Combobox` and `FormCombobox` bind to the **port**, never
to a library. The alternative is a component per library per control, which is the multiplication
ADR-0008 exists to prevent.

### 13. Deferred, deliberately: the states of data arriving

Loading, empty-because-still-fetching and error are **not decided here**. They are the consumer's
data lifecycle, the DS now has `Skeleton` and `Progress` for the visual half, and deciding a
loading contract before a consumer has asked for one is how a component grows a prop nobody uses.
The seam stays open; the decision waits for the first real case.

## Consequences

**What this buys.** The four refusals in `Select`'s documentation stop pointing at nothing. The
`multiple` case gets an answer that is not a scrolling native multi-select with a ctrl+click nobody
discovers. The pipeline shape keeps the data, the matching and the fetching on the consumer's side,
where every other data-shaped decision in this package already lives.

**What it costs, and none of this is recoverable later.**

- A control that requires JavaScript, in a library whose other controls do not. Scoped, authorised,
  and written into the component's own docs where a consumer chooses it.
- Everything the platform was doing for `Select` is now ours to write and to keep correct: the
  keyboard, the announcements, the mobile shape, the top-layer behaviour, forced colors.
- Two shipped components (`Input`, `Select`) get refactored so the box lives in one place. Their
  rendering must not change; that is a test, not a hope.
- On a phone, a `Combobox` is not the OS picker and never will be.

**What it obliges.** When the component ships: the roadmap's `Combobox` bullet moves from **Deferred**
into **Shipped**, and the **Next** section's claim that nothing defers to a missing component is
corrected — it was already wrong, and `Select` is the evidence.

**What would reverse it.** If `appearance: base-select` reached Baseline Widely _and_ the customizable
`<select>` grew a text entry, this component's single-select half would become a native control
again. That is not on any standards track today. The multi-select-with-chips half would still have
no native answer.
