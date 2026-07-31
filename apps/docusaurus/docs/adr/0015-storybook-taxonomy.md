# ADR 0015 — Storybook categories live in story titles; docs come in three levels

- **Status:** superseded by [ADR-0019](./0019-ui-package-organisation.md) (2026-07-30) — was: accepted (2026-07-30)
- **Date:** 2026-07-30
- **Deciders:** Fabio Menchicchi

> **Superseded.** This decision now lives in [ADR-0019 — How the UI package is organised](./0019-ui-package-organisation.md),
> which consolidates it with the decisions it belonged with. The text below is kept unchanged as the
> record of what was decided and why; read 0019 for what is in force.

## Context and problem statement

ADR-0014 put every component in its own folder, parts included, and the folder tree deliberately
carries **no** taxonomy: `field-label/` sits next to `input/` and `alert/`, and nothing says one is a
part of a compound and another is feedback. Twice during that work the question came back as "shouldn't
we group these into folders?" — once per family, once per logical category — and each attempt cost
real breakage (a docs-coverage glob pinned to a depth, an import lint rule defeated by nesting, three
rounds of rewritten imports).

The pull is legitimate: a reader browsing a design system **does** want categories. The mistake was
assuming the filesystem is where they belong.

There is a second, related gap. `Field` and `Fieldset` share parts (`FieldDescription`, `FieldError`),
a binding rule, and a contract with the consumer's validation library. That material belongs to neither
page, so it was being duplicated into both.

## What the ecosystem does

Read from the live docs, not assumed:

| Library     | Source tree | Docs sidebar                                                                                        |
| ----------- | ----------- | --------------------------------------------------------------------------------------------------- |
| **MUI**     | flat        | Inputs · Data display · Feedback · Surfaces · Navigation · Layout · Utils                           |
| **Mantine** | flat-ish    | Layout · Inputs · Combobox · Buttons · Navigation · Feedback · Overlays · Data display · Typography |

Both keep the taxonomy **in the docs**, not in the source. `Alert` → Feedback and `Badge` → Data
display are unanimous across the two; Mantine files `Fieldset` and `Input` under Inputs; the only real
disagreement is `Button`, which MUI files under Inputs and Mantine gives its own **Buttons** group.

## Decision

**The logical taxonomy lives in the Storybook `title`, never in the folder tree.** Re-categorising is
then a one-string change, which matters because category boundaries are contested and drift (`Badge`:
feedback or data display? `Alert`: feedback or overlay?).

The categories, and why:

```
Components/Inputs/Field         Components/Feedback/Alert
Components/Inputs/Fieldset      Components/Data display/Badge
Components/Inputs/Input         Components/Buttons/Button
```

- **Inputs**, **Feedback**, **Data display** follow both references.
- **Buttons** follows Mantine over MUI: our `Button` is an action everywhere, not only in forms, and
  filing it beside `Field` and `Input` suggests it is a form control — which invites putting one inside
  a `<Field>`. The cost is a category with a single member; that is cheaper than the wrong implication.
- **No empty categories.** Navigation, Overlays and Layout are opened by their first member, not before.

**Documentation comes in three levels, with hard boundaries:**

1. **Category** — navigation only, from the story title. Carries no semantics.
2. **Family page** — one per component family (ADR-0014): the container plus a props table per part, on
   one page. A part ships no page of its own, because you do not compose a `FieldLabel` without a
   `Field`: if you have not opened the Field page, that component is not one you need.
3. **Concept page** — under `Guidelines/`, for material that spans families and therefore belongs to no
   component page. `Guidelines/Form field wiring` is the first: the nearest-container binding rule,
   what `Field` and `Fieldset` each own, `useField` for third-party controls, and the boundary with the
   consumer's validation library. Each component page links to it instead of restating it.

## Consequences

- The folder tree stays flat and free of taxonomy, so ADR-0014 stands unchanged and the tooling
  (globs, entries, exports, imports) keeps needing no depth reasoning.
- A component's category is one string in its `meta`. Moving `Badge` from Data display to Feedback is a
  one-line diff with no import, entry or export churn.
- Storybook sorts categories alphabetically unless configured; no sort is configured, and none is
  needed until the category count makes the default order actively unhelpful.
- The concept page is the designated home for cross-family material. When a second cluster grows one
  (overlays sharing focus management, say), it gets its own `Guidelines/` page rather than being
  duplicated into each component's doc.
- Duplication that already exists between the `Field` and `Fieldset` pages should migrate to the
  concept page as those pages are next touched, rather than in a separate sweep.
