# ADR 0014 — One folder per component, compound parts included

- **Status:** superseded by [ADR-0019](./0019-ui-package-organisation.md) (2026-07-30) — was: accepted (2026-07-29)
- **Date:** 2026-07-29
- **Deciders:** Fabio Menchicchi

> **Superseded.** This decision now lives in [ADR-0019 — How the UI package is organised](./0019-ui-package-organisation.md),
> which consolidates it with the decisions it belonged with. The text below is kept unchanged as the
> record of what was decided and why; read 0019 for what is in force.

## Context and problem statement

Until `Field` and `Fieldset`, every component was one component, so the layout question never came up:
`components/<name>/` held the component, its types, its CSS module, its variants, its test, its stories
and its mdx, and that was that.

Compound components broke the assumption. `Field` arrived with `FieldLabel`, `FieldDescription`,
`FieldError` and a context; `Fieldset` with `FieldsetLegend` and `FieldsetContent`. Suddenly one folder
held four components, two of them shared with the sibling family, and thirteen files at one level. Three
questions had no answer:

1. do the parts live in the family's folder, in a subfolder, or somewhere else?
2. **who owns a part used by two families?** `FieldDescription` binds to whichever container is nearest,
   so it belongs to `Field` no more than to `Fieldset`.
3. where do the parts' tests, types and styles live?

We tried five layouts before deciding, and each one broke something real — the docs-coverage glob, the
import-boundary lint rule, or the promise a folder makes to whoever opens it. The decision below is the
one that survived, and it was checked against what the ecosystem actually does rather than argued from
taste.

## What the ecosystem does

Read from source, not from docs (files listed are real):

| Library       | A compound family                                                                                                                |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| **shadcn**    | `ui/field.tsx` — ONE file holding Field, FieldSet, FieldLegend, FieldLabel, FieldDescription, …                                  |
| **Radix**     | `react/accordion/src/` → `accordion.tsx` (root + item + trigger + content + context), one test                                   |
| **Chakra v3** | `components/fieldset/` → `fieldset.ts`, `index.ts`, `namespace.ts`                                                               |
| **Mantine**   | `Fieldset/` → `Fieldset.tsx`, `.module.css`, `.test.tsx`, `.story.tsx`, `index.ts`                                               |
| **MUI**       | `Accordion/`, `AccordionSummary/`, `AccordionDetails/`, `AccordionActions/` — **sibling folders**, each with its own `X.test.js` |
| **Base UI**   | `field/{root,label,description,error,control,item}` — nested folders, each with its own `X.test.tsx`                             |

The pattern that matters: **the two libraries that give a part its own folder also put the part's test in
it** (MUI, Base UI). Everyone else keeps the compound in one file or one file per kind, flat. The middle
ground we had reached — a folder per part with the test and types left at family level — is done by
nobody, and for good reason: it promises self-containment it does not deliver.

## Decision

**Every component gets its own folder, as a sibling of every other component. A compound part is a
component: it gets a folder too. Each folder is self-contained.**

```
components/
  field/              field.component.tsx  field.context.tsx  field.types.ts  field.module.css
                      field.test.tsx  field.stories.tsx  field.mdx  use-field.ts  index.ts
  field-label/        field-label.component.tsx  .types.ts  .module.css  .test.tsx  index.ts
  field-description/  …
  field-error/        …
  fieldset/           …
  fieldset-legend/    …
  fieldset-content/   …  + .variants.ts
  button/  input/  badge/  alert/
```

This is MUI's model. Four rules follow from it:

1. **A part owns its own CSS module, types, test and barrel.** No file reaches into another folder's
   stylesheet — which is what made the parts non-self-contained in every earlier attempt.
2. **A part's test mounts the container when the behaviour needs it**, with the wrapper declared once per
   file (`renderInField(node)`), the way Base UI's `describeConformance` does. A behaviour that belongs to
   the container is tested in the container's suite; one that belongs to the part is tested in the part's,
   even though the container appears in it.
3. **Importing a sibling's `*.context.js` is normal**, not a smell. It is the mechanism a control uses to
   become field-aware, and MUI does exactly this (`InputBase.js` imports
   `../FormControl/FormControlContext`).
4. **A part ships no `.mdx`, and Storybook aggregates by family.** One page per family, with a props
   table per part ON that page (`<ArgTypes of={FieldLabel} />` next to the container's `<Controls>`), not
   one sidebar entry per part. The consumer's unit of thought is "Field", not "FieldLabel": everything
   worth reading — the anatomy, the a11y notes, the nearest-container rule, the `name` that scopes a radio
   group — is family-level material, and splitting it across seven pages either duplicates it or loses it.
   Radix and Base UI present compounds the same way. Note the one friction: curated `argTypes` live in the
   primary component's `meta`, so a part's table comes from react-docgen; where docgen is not good enough,
   the part gets its own `meta` with curated argTypes and its sidebar entry suppressed, so the page count
   stays at one per family.

### Why flat, and not a hat folder per family

iungo groups families under a parent (`input/` holding `checkbox/`, `radio-button/`, `date-time/`;
`cards/` holding `card/`, `card-simple/`, `shared/`), and Base UI does the same one level in
(`field/{root,label,description,error}`). That shape was built here and then removed, so the criterion is
worth stating rather than re-deriving:

**A hat folder earns its place only when the names do NOT share a prefix.** iungo's `input/` groups
`checkbox`, `radio-button`, `date-time` — no common prefix, so only the folder can express the relation.
Ours do share one: `field-label`, `field-description`, `field-error` already sort next to `field`, and
`fieldset-legend`, `fieldset-content` next to `fieldset`. **The prefix is already the grouping**; a hat
would add a level without adding information.

Three things a hat costs that flat does not:

- **a recurring decision.** Every new component asks "which hat?", and mis-grouping costs a move later
  (`Input` is wired BY `Field` but is not part of it — does it go inside or not?). Flat asks nothing.
- **depth on every path.** Measured on the way here: a docs glob pinned to a depth broke **silently**, the
  import-boundary lint rule was defeated by nesting twice, and imports were rewritten three times. Flat is
  the only shape where none of those tools has to reason about depth.
- **a claim that is often false.** A tree asserts ONE parent. `FieldDescription` belongs to `Field` and to
  `Fieldset`; `Input` to neither. A flat list asserts nothing about relations, so it cannot assert a wrong
  one — the relation is carried by the name and documented in the family's page.

The standalone controls still to come — Checkbox, Radio, Switch, Select, Textarea — need no grouping at
all: they do not compose into one another and each is looked up by name. They are a list, not a tree.

The question of who owns a shared part **dissolves**: `FieldDescription` is a component in its own right,
sibling to both families, owned by neither. This is why MUI has no `shared/` folder anywhere.

## Consequences

- **The component-to-component import-boundary lint rule is removed.** Under this model importing a
  sibling's context is the intended mechanism, so a rule forbidding cross-folder imports and this layout
  are incompatible by construction. The boundary that remains enforced is the one that matters and is
  machine-checkable: Nx tags between packages. Within the package, the discipline is a convention — a
  part imports a sibling's `*.context.js`, not its `*.component.js`.
- **`components/` grows.** Two compound families produce seven folders. That is the cost of the model and
  it is accepted knowingly: it is the reason MUI's `src/` has hundreds of entries. The mitigation is
  naming — a part is always `<family>-<part>`, so it sorts next to its family.
- **The docs-coverage glob must not be pinned to a depth.** A glob like `components/*/*.component.tsx`
  stops finding components the moment the tree moves and **stays green while checking nothing**; it is
  now depth-agnostic with the two-clause coverage rule above.
- **One vite entry and one `exports` subpath per component**, parts included, so a consumer can import
  `@fmmenchi/ui/field-error` alone.
- **The generator must scaffold this shape.** `@fmmenchi/nx-ui:component` currently scaffolds a single
  component folder, which is already correct for a simple component; scaffolding a compound (a family
  plus its parts) is not yet supported and is the follow-up.
- Simple components (`Button`, `Input`, `Badge`, `Alert`) already satisfied this model — one component,
  one folder. This ADR does not move them; it records the rule so the next compound does not re-litigate
  it.
