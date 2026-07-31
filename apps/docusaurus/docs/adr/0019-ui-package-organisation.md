# ADR 0019 — How the UI package is organised: one folder per component, taxonomy in the docs

- **Status:** accepted (2026-07-30) — consolidates [ADR-0014](./0014-one-folder-per-component.md) and [ADR-0015](./0015-storybook-taxonomy.md)
- **Date:** 2026-07-30
- **Deciders:** Fabio Menchicchi

> Supersedes 0014 and 0015, whose text stands unchanged for the record. Neither is reversed: 0015 was
> already written on top of 0014, and the two answer one question — how you find a component, in the
> tree and in the docs.

## Context and problem statement

Until `Field` and `Fieldset`, every component was one component and the layout question never came up.
Compound components broke that: `Field` arrived with three parts, a context and a hook, `Fieldset` with
two more, two of them shared between the families — thirteen files at one level and no answer to _who
owns a part used by two families_.

Then the same pull returned as a second question: shouldn't components be grouped into folders by
family, or by logical category? Five layouts were tried, and each attempt broke something real — a
docs-coverage glob pinned to one depth, an import lint rule defeated by nesting, three rounds of
rewritten imports.

The pull is legitimate. A reader browsing a design system **does** want categories. The mistake was
assuming the filesystem is where they belong.

## What the ecosystem does

Read from source, not asserted:

| Library     | A compound family                                                                                    | Docs sidebar                                                                |
| ----------- | ---------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| **shadcn**  | `ui/field.tsx` — ONE file holding Field, FieldSet, FieldLegend, FieldLabel, FieldDescription         | —                                                                           |
| **Radix**   | `accordion.tsx` (root + item + trigger + content + context), one test                                | —                                                                           |
| **Chakra**  | `fieldset.ts`, `index.ts`, `namespace.ts`                                                            | —                                                                           |
| **Mantine** | `Fieldset/` → `.tsx`, `.module.css`, `.test.tsx`, `.story.tsx`, `index.ts`                           | Layout · Inputs · Buttons · Navigation · Feedback · Overlays · Data display |
| **MUI**     | `Accordion/`, `AccordionSummary/`, `AccordionDetails/` — **sibling folders**, each with its own test | Inputs · Data display · Feedback · Surfaces · Navigation · Layout           |
| **Base UI** | `field/{root,label,description,error}` — nested folders, each with its own test                      | —                                                                           |

Two patterns matter. **The libraries that give a part its own folder also put the part's test in it**
(MUI, Base UI) — the middle ground we had reached, a folder per part with the test left at family
level, is done by nobody, because it promises self-containment it does not deliver. And **both
libraries with a categorised sidebar keep their source flat**: the taxonomy lives in the docs.

## Decision

### 1. One folder per component, as a sibling of every other. A part is a component.

```
components/
  field/              component  context  types  module.css  test  stories  mdx  use-field  index
  field-label/        component  types  module.css  test  index
  field-description/  component  types  module.css  test  index
  fieldset/           …          fieldset-legend/   …        fieldset-content/  …
  input/  button/  badge/  alert/  input-group/
```

Four rules follow:

- **A part owns its CSS module, types, test and barrel.** No file reaches into another folder's
  stylesheet — which is what made every earlier attempt's parts not actually self-contained.
- **A part's test mounts the container when the behaviour needs it**, with the wrapper declared once
  per file (`renderInField(node)`), as Base UI's `describeConformance` does. Behaviour that belongs to
  the container is tested in the container's suite.
- **Importing a sibling's `*.context.js` is normal**, not a smell — it is how a control becomes
  field-aware, and MUI does exactly this (`InputBase` imports `../FormControl/FormControlContext`).
- **A part ships no `.mdx`.** See the documentation levels below.

The ownership question **dissolves**: `FieldDescription` is a component in its own right, sibling to
both families, owned by neither. This is why MUI has no `shared/` folder anywhere.

### 2. Flat, not a hat folder per family

A hat folder (iungo's `input/`, Base UI's `field/`) was built here and removed. The criterion, so it is
not re-derived: **a hat earns its place only when the names do NOT share a prefix.** iungo's `input/`
groups `checkbox`, `radio-button`, `date-time` — no common prefix, so only a folder can express the
relation. Ours share one: `field-label` already sorts next to `field`. **The prefix is the grouping**;
a hat would add a level without adding information.

Three things a hat costs that flat does not: **a recurring decision** (every new component asks "which
hat?", and mis-grouping costs a move); **depth on every path** — measured here, where a glob pinned to
one depth broke _silently_ and an import lint rule was defeated by nesting twice; and **a claim that is
often false**, since a tree asserts one parent while `FieldDescription` belongs to two containers and
`Input` to neither.

### 3. The logical taxonomy lives in the Storybook title, never in the tree

```
Components/Inputs/Field         Components/Feedback/Alert
Components/Inputs/Fieldset      Components/Data display/Badge
Components/Inputs/Input         Components/Buttons/Button
Components/Inputs/InputGroup
```

Inputs, Feedback and Data display follow both references. **Buttons** follows Mantine over MUI: ours is
an action everywhere, not only in forms, and filing it beside `Field` suggests it is a form control —
which invites putting one inside a `<Field>`. A single-member category is cheaper than the wrong
implication. **No empty categories**: Navigation, Overlays and Layout open with their first member.

Re-categorising is then a one-string change, which matters because these boundaries are contested and
drift (`Badge`: feedback or data display?).

### 4. Documentation comes in three levels, with hard boundaries

1. **Category** — navigation only, from the story title. Carries no semantics.
2. **Family page** — one per family: the container plus a props table per part, on one page. A part
   ships no page, because you do not compose a `FieldLabel` without a `Field`.
3. **Concept page** — under `Guidelines/`, for material spanning families and therefore belonging to no
   component page. `Guidelines/Form field wiring` is the first: the nearest-container binding rule,
   what `Field` and `Fieldset` each own, `useField`, and the boundary with the consumer's validation
   library. Component pages link to it instead of restating it.

## Consequences

- **The component-to-component import-boundary lint rule is removed.** Under this model importing a
  sibling's context is the intended mechanism, so the rule and the layout are incompatible by
  construction. What stays machine-checked is the boundary that matters: Nx tags between packages.
- **`components/` grows** — two compound families produce seven folders. That is the cost, accepted
  knowingly; it is why MUI's `src/` has hundreds of entries. The mitigation is naming.
- **No glob may be pinned to a depth.** `components/*/*.component.tsx` stops finding components the
  moment the tree moves and **stays green while checking nothing**. The docs-coverage check is
  depth-agnostic, and accepts a part covered by the family doc that **names its export**.
- **One vite entry and one `exports` subpath per component**, parts included.
- **The generator scaffolds a component, not a family.** A part is a component, so it is scaffolded by
  running the generator again; a `--parts` flag would contradict this ADR. Curated `argTypes` live in
  the primary component's meta, so a part's table comes from react-docgen — where that is not good
  enough, the part gets its own meta with its sidebar entry suppressed, keeping one page per family.
- Simple components already satisfied this model; the ADR records the rule so the next compound does
  not re-litigate it.
