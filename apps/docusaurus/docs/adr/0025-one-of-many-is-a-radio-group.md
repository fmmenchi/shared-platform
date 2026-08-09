# ADR 0025 — One of many, drawn as buttons, is a radio group

- **Status:** accepted (2026-08-09)
- **Date:** 2026-08-09
- **Deciders:** Fabio Menchicchi

> Closes the question [ADR-0024](./0024-toggle-switch-checkbox-boundary.md) left open in its own
> consequences: _"a future `ToggleGroup` is not this component and does not change this boundary:
> 'exactly one of these' is a radio group's question, and a group of toggles that enforces it needs
> its own decision."_ This is that decision. Nothing in ADR-0024 is reversed.

## Context and problem statement

`Toggle` shipped, and `Toolbar` shipped a week later. Between them they answer "several of these,
independently": a bar takes one tab stop, the arrows walk it, and each toggle keeps its own
`aria-pressed`. Bold, italic, underline — three separate answers, and no component was needed for
the set, because `Toolbar` walks controls it does not own.

What has no answer is the other shape, and it is at least as common: **exactly one** of a small set,
drawn as a row of buttons. Text alignment. A date range. A view switcher. Every design system has
one, usually called a segmented control or a toggle group, and the question is what it should BE.

The tempting answer is a row of `Toggle`s with the component keeping one of them pressed. It looks
right, it reuses what exists, and it is wrong in the only layer that cannot be restyled:
`aria-pressed` says **this button is on**. It says nothing about the others. A screen-reader user
meets three independent toggle buttons and is never told they are alternatives, never told how many
there are, never told which of them they are on — the "2 of 3" that makes a set navigable comes from
a radio group and from nothing else. Worse, the failure is silent to everyone who can see the row.

The platform already implements the pattern completely. `Radio`'s own source says so, in the sentence
that decided this ADR: _"radios pair by their shared `name`, and the platform then gives arrow-key
navigation, roving focus and one tab stop per group for free."_

## Decision drivers

- Native-first (ADR-0002): a pattern the browser implements is not re-implemented here.
- The mistake is invisible to the person making it, and only a screen reader finds it.
- ADR-0016: a component earns its place by what it does that the alternative cannot.
- A shape is not a semantic. Two components that look identical may be answering different
  questions, and the accessibility tree is where the difference is real.

## Decision

### 1. `ToggleGroup` is a radio group, drawn as buttons

Each segment is a native `<input type="radio">`; the visible button is drawn on its `<label>`, and
the input is hidden from sight and from nothing else — it keeps its place in the tab order, the
accessibility tree and the form. Every state the segment paints is read from the input with `:has()`
(`:checked`, `:focus-visible`, `:disabled`), so what is drawn cannot drift from what is submitted.

What that buys, none of it written here: arrow keys that move **and** select, wrapping at both ends,
one tab stop for the whole set, the "2 of 3" announcement, a value that submits under a shared
`name`, and `form.reset()`.

The focus ring is drawn on the label rather than the input, because the label is what the eye
follows. This is the one arrangement `VisuallyHidden` refuses to host, and its guard is right in
general — something focusable that cannot be seen is normally a bug. It is not one here, and the
reason is written where the exception is taken.

### 2. Many-of-many gets no component

`Toolbar` + `Toggle` already is it. Adding a second component for the multi-select case would be one
earning its place by symmetry with other design systems, which ADR-0016 does not accept — the same
argument that rejected `Text`.

### 3. The group owns the value; the item owns nothing

`name`, `checked` and `defaultChecked` are the group's, and are not props on the item. The rule that
a part must not carry a control's value (ADR-0013) protects a part that IS a control; here the group
is the control and the set has one value. An item able to set its own `checked` could disagree with
its siblings, which is the state a radio group exists to make unspeakable.

Uncontrolled, the item is handed `defaultChecked` and never `checked`, so the DOM keeps the choice
and `form.reset()` works — the same reasoning, and the same measured failure, as every other control
in the package.

### 4. Where the line runs, in one table

| You are asking                                        | Reach for            |
| ----------------------------------------------------- | -------------------- |
| exactly one of these — alignment, a range, a view     | `ToggleGroup`        |
| any of these, independently — bold, italic, underline | `Toolbar` + `Toggle` |
| one of these, as a list rather than a row of buttons  | `Fieldset` + `Radio` |

The first and third are the same semantics in two shapes, and choosing between them is a design call
about the options: short and comparable, or long enough to need a sentence each.

## Consequences

- The keyboard for this pattern is the browser's, so there is no roving `tabindex`, no key handler
  and no `useDescendants` in it — unlike `Tabs`, `Menu` and `Toolbar`, which have no native shell to
  build on. It is the cheapest family in the package by a wide margin.
- It is a **field**, which some consumers will not expect from something that looks like buttons:
  put one in a form without a `name` and it submits nothing. `name` is therefore required.
- A bound version belongs to the form-adapter family, alongside `FormChoice` and `FormSwitch`.
- Styling is constrained by what a `<label>` can draw around a hidden input. That is a real limit and
  it is the price of the pattern being the platform's; anything it cannot express should be
  reconsidered as a `Menu` or a `Select` rather than reclaimed with `role`.
