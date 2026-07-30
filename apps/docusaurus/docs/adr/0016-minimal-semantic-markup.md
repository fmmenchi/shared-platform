# ADR 0016 — Markup is minimal and semantic; an element must earn its place

- **Status:** accepted (2026-07-30)
- **Date:** 2026-07-30
- **Deciders:** Fabio Menchicchi

## Context and problem statement

A design system's markup is multiplied by every page of every consumer. A wrapper that looks harmless
in a component's source appears thousands of times in a product, and each one is a node the consumer
has to read in devtools, style around, and reason about when a layout misbehaves.

Compound components make this worse, because every part invites an element: a label, a description, an
icon, a "slot" for the icon. The API reads well; the DOM fills with `<span>` and `<div>` that exist only
to carry a class.

We shipped one. `InputGroupSlot` was a `<span>` whose entire job was a `gap`, a muted colour and
`pointer-events: none` — three declarations. It looked like good composition and it was filler.

## Decision

**An element is justified only by something it does that the alternative cannot. Never by "it makes
the API tidier".**

Before adding one, name that something. Three outcomes:

- **It earns its place** when it owns layout that siblings need, or chrome the semantic element cannot
  carry. `Field` owns the grid that spaces label, control and description. `FieldsetContent` exists
  because the rendered `<legend>` sits outside the fieldset's anonymous box, so the container's `gap`
  cannot reach it — measured across three engines, not assumed. `InputGroup` owns a border that an
  `<input>` cannot, because an input renders no children.
- **It does not** when its job is a few CSS declarations. Those belong on the element that is already
  there: a `gap` on the container it is inside, a rule on `:is(input, textarea)`, a colour on the
  parent that the child inherits.
- **A context provider needs no DOM node at all.** If a component only provides context, it renders
  its children and nothing else.

Prefer the semantic element over the generic one at every step: `<p>` over `<div>` for text, `<label>`
and `<legend>` over a styled span, a native `<fieldset>` over `role="group"` (ADR-0014's reasoning).
The generic element is what you reach for when no semantic one fits — not the default.

## The evidence this came from

Two independent adversarial reviewers went over `InputGroup` and returned roughly twenty findings.
**Eleven of them existed only because of the slot element and a click-to-focus JavaScript handler** —
`pointer-events` inheriting onto a focusable child, a forced-colors rule that inverted its own intent,
a target-size violation in the shipped example, `closest()` walking out of the component, a hidden
input hijacking focus, right-click stealing focus.

Deleting the slot and the handler resolved all eleven without a single fix. The remaining defect — a
double border in the invalid state — was one missing CSS declaration and had nothing to do with either.

That ratio is the argument. Complexity does not merely cost the lines it adds; it generates defects in
proportion to the surface it creates.

## Consequences

- **Review heuristic:** when a review returns a long list of edge cases, ask first which part of the
  design is generating them, before fixing them one by one. A list of twenty findings is sometimes one
  design decision wearing twenty hats.
- **A part is not automatically an element.** ADR-0014 says a compound part is a component in its own
  right; it does not follow that it renders a node. A part whose contribution is presentational is
  better expressed as a rule on the container.
- Existing markup stands, audited against this rule: `Field`'s and `FieldsetContent`'s elements own
  layout, `InputGroup`'s owns chrome, and the text parts render `<p>` — a semantic element, not a
  wrapper. `InputGroupSlot` is removed.
- **The cost is paid by the consumer, not by us**, which is exactly why it needs a written rule: the
  pressure in review is always toward the tidier-looking API, and the party who pays is not in the room.
