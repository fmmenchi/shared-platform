# ADR 0035 — A tag is a value you can take back, and the set owns the focus

- **Status:** proposed (2026-09-03)
- **Date:** 2026-09-03
- **Deciders:** Fabio Menchicchi

> The fourth boundary ADR, and the same shape as the other three:
> [ADR-0024](./0024-toggle-switch-checkbox-boundary.md) separated three controls that look alike,
> [ADR-0025](./0025-one-of-many-is-a-radio-group.md) separated answering a question from navigating,
> and [ADR-0034](./0034-a-side-panel-is-not-a-drawer.md) separated two side surfaces by what the page
> can still do.
> This one separates a label that is only a label from a value the reader can remove — and says why
> the word "chip" is not the name for it. Nothing here changes `Badge`, `Toggle` or `ChoiceField`; it
> says what is NOT them, under the admission test
> [ADR-0016](./0016-minimal-semantic-markup.md) sets for anything new.

## Context and problem statement

Three pages already shipped in this package promise a component that does not exist:

| where                             | what it promises                                                                                                     |
| --------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `badge.mdx`                       | "A clickable or removable badge is a Tag/Chip (a real `<button>` with its own focus and label), not this component." |
| `select.mdx:59`                   | several options, many → **a combobox with chips**                                                                    |
| [ADR-0028](./0028-combobox.md) §5 | multiple selection ships **with chips**, each removable and keyboard-reachable                                       |

That is the strongest reason this design system's roadmap accepts — a written contract waiting on a
component — and it is waiting three times. The question is not whether to build it. It is **what
exactly it is**, because the shape most libraries ship under this name is four components wearing one
coat, and three of those four already exist here.

### The word "chip" names a shape, and gathers four things under it

Material defines a chip as "a compact element representing an input, attribute, or action" and then
lists four kinds: **assist**, **filter**, **input**, **suggestion**. That is a name for the pill, not
for the meaning, and the four behave nothing alike. Mapped onto this package:

| Material's kind     | what it already is here                                     |
| ------------------- | ----------------------------------------------------------- |
| assist / suggestion | `Button` (ghost, small)                                     |
| filter, on/off      | `Toggle` — a pressed state                                  |
| filter, one of many | `ChoiceField` · `SegmentedControl` (ADR-0025)               |
| **input**           | **nothing** — a value the reader put there and can take out |

Only the fourth is missing. Naming the new component `Chip` would invite the other three back: the
first request for `variant="filter"` would be reasonable, because in the asker's head a chip is also
that — and the result is one component with four behaviours, which is the prop-driven twin this
package has already refused once (`TabsSimple`, `AccordionSimple`).

### The half nobody documents: the focus a removal destroys

Press the ✕ on the third of six tags and the button holding the focus stops existing. The browser
drops focus to `<body>`, so the next `Tab` starts the page again from the top — a keyboard user
clearing four filters is sent back to the skip link four times. It is invisible to a mouse, which is
why it survives in shipped design systems, and it **cannot be fixed by the tag**: by the time it is
gone it has nothing left to move the focus with.

## Decision

### 1. The component is `Tag`, and `onRemove` is required

A tag is a value the reader can take back. The prop is the admission test rather than a description
of one: remove the removal and nothing is left that `Badge` does not already do — a `<span>` whose
text is its accessible name. `badge.mdx` sends the interactive case away by naming what it must have,
"a real `<button>` with its own focus and label", and a `Tag` with an optional `onRemove` has neither
on half its call sites; the two would then drift into look-alikes with no rule to separate them.

The name is `Tag`, not `Chip`: it names the meaning (a label attached to something, sometimes
removable) rather than the shape, and it is the name React Aria and Spectrum — the a11y-first
precedent this package follows for ARIA patterns — Chakra, Ant, Carbon and Polaris all use. ADR-0028
keeps its word "chips" for the feature inside the combobox; it never named a component, and nothing
in it is reversed.

### 2. `TagList` is a `<ul>`, and it owns the focus a removal destroys

The set is a real list, so a screen reader announces "list, 3 items" — how many filters are on before
which ones. Each `Tag` is an `<li>`, the shape `BreadcrumbLink` and `StepperItem` already have.

The list, being the only thing still standing after a tag goes, performs the recovery: focus lands on
the remove control that took the departing one's place — the tag after it, or the last one when the
last was removed — and on the list itself when the last tag goes, the same rescue `AppLayoutNav`
performs when the form holding the focus is destroyed.

What it watches is a **DOM mutation**, not its own render. The state holding the tags may live below
the list — `Tag` renders the `<li>`, so a wrapper between them adds no markup — and a removal then
re-renders only that wrapper. A rescue hung on the list's own render does nothing at all in that
composition, silently, in the one case the component exists for.

Three refusals come with it:

- **nothing moves unless the reader was on the control that was pressed.** In Safari a pressed button
  does not take focus at all, so a mouse click there must move nothing — and asking merely whether
  the focus was somewhere in the list is one scope too wide: it drags the focus off a DIFFERENT tag
  the reader deliberately chose;
- **nothing moves if the reader has since gone elsewhere.** A deferred removal leaves time for that,
  so the entitlement is checked at the rescue rather than at the click: `<body>` — where the browser
  leaves the focus when it destroys the focused element — or somewhere still inside this list;
- **nothing moves until the tag is really gone.** The removal is the app's to perform and it may
  refuse it or take a round trip over it, so the recovery reads the DOM rather than trusting the click.

### 3. Every remove control is a real tab stop — no roving, no `grid`

ADR-0028 asks that "removal is reachable from the keyboard without a mouse", and a real `<button>` per
tag is that, with `Enter` and `Space` from the platform. The `grid` pattern React Aria uses collapses
a set into a single tab stop, which is right for a hundred tags and costs an interaction model the
reader has to learn; a handful does not need it. When something here holds hundreds, that is its own
decision.

### 4. It ships with no variants

No colour, no size, no `disabled`. `Badge`'s axes exist because there the colour IS the meaning
(overdue, live, draft); a tag is the value the reader put there, and a set of them reads as one thing.
An axis can be added later without breaking anyone, which is not true of removing one added on a guess.

## Consequences

- The three promises above now point at something that exists. The combobox's multi-select is
  **unblocked, not done** — it stays a commit on a shipped component.
- `Badge` stays presentational for good, with a rule rather than a convention behind it.
- A consumer wanting a non-removable pill is sent to `Badge`, and one wanting an on/off criterion to
  `Toggle` — both by the type system, since `onRemove` is required.
- Tags inside a `Combobox`'s field are **not** settled here: that surface is a control, not a list, and
  whether the same `Tag` can live in it is part of the multi-select work.
- A hundred-tag set has no answer yet, and would need the roving/`grid` decision this defers.
