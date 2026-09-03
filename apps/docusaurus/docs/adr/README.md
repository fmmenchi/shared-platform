# Architecture Decision Records

Significant architectural decisions for this platform are recorded here as ADRs, one file per
decision, numbered sequentially: `NNNN-<kebab-title>.md`.

- **Statuses:** `draft (scouting)` → `proposed` → `accepted` | `rejected` | `superseded by NNNN`.
- A **scouting ADR** captures the problem, the decision drivers and the options to explore _before_ a
  decision exists; the decision itself lands either by updating the ADR to `accepted` or in a follow-up
  ADR that supersedes it.
- **Never rewrite an accepted ADR: supersede it with a new one.** A number is an identifier — it is
  referenced from code comments, commit messages, pull requests and published packages — so it is never
  reused and never renumbered. A gap in the sequence is information, not a mistake.
- **Consolidating** several ADRs into one follows the same rule: the new ADR states what is in force,
  the old ones stay, marked `superseded by NNNN` with a pointer forward. Every existing reference still
  lands somewhere that redirects it.

## In force

Read these. Nineteen decisions, grouped as they are actually made.

| ADR                                                   | Title                                                                    |
| ----------------------------------------------------- | ------------------------------------------------------------------------ |
| [0002](./0002-ui-library-foundations-decision.md)     | UI library foundations: native-first, no behaviour layer                 |
| [0006](./0006-absorb-ui-ports.md)                     | Absorb `@fmmenchi/ui-ports` into `@fmmenchi/ui`                          |
| [0007](./0007-security-scanning-workspace-level.md)   | Security scanning is workspace-level                                     |
| [0008](./0008-cross-app-framework-agnostic-layers.md) | What earns a place as a shared layer (cross-app + framework-agnostic)    |
| [0013](./0013-form-controls-contract.md)              | Form controls are transparent native controls; validation stays out      |
| [0016](./0016-minimal-semantic-markup.md)             | Markup is minimal and semantic; an element must earn its place           |
| [0017](./0017-browser-platform-target.md)             | Browser platform target: Baseline Widely, Newly as enhancement           |
| [0018](./0018-how-the-ds-ships-css.md)                | How the design system ships CSS: layer, typed tokens, no runtime         |
| [0019](./0019-ui-package-organisation.md)             | How the UI package is organised: folders, taxonomy, doc levels           |
| [0020](./0020-where-things-live.md)                   | Where things live: `packages/` published, `apps/` not, docs with code    |
| [0021](./0021-anchored-surfaces.md)                   | Anchored surfaces: platform layer, imported geometry, our behaviour      |
| [0022](./0022-browser-defaults-no-reset.md)           | Browser defaults: components normalise themselves, baseline optional     |
| [0023](./0023-one-stylesheet.md)                      | The design system ships one stylesheet; JS subpaths stay                 |
| [0024](./0024-toggle-switch-checkbox-boundary.md)     | Toggle, Switch and Checkbox: where the boundary between them runs        |
| [0025](./0025-one-of-many-is-a-radio-group.md)        | One of many, drawn as buttons, is a radio group                          |
| [0026](./0026-formatting-is-a-shared-layer.md)        | Formatting values is a shared layer; the DS only binds it                |
| [0029](./0029-infer-facts-generate-policy.md)         | A plugin infers facts and generates policy                               |
| [0030](./0030-an-announcement-is-an-event.md)         | An announcement is an event, and announcing is not releasing             |
| [0031](./0031-being-describable-is-a-fact.md)         | Being describable is a fact; the release record decides who gets an SBOM |
| [0032](./0032-tokens-gain-a-primitive-layer.md)       | Tokens gain a primitive layer, derived with relative colour              |
| [0033](./0033-theme-builder-gui.md)                   | A GUI for the theme generator (proposed)                                 |
| [0034](./0034-a-side-panel-is-not-a-drawer.md)        | A non-modal side panel is not a drawer (proposed)                        |
| [0035](./0035-a-tag-is-a-value-you-can-take-back.md)  | A tag is a value you can take back (proposed)                            |

## Proposed

Decided on paper, awaiting review — not yet in force.

| ADR                                  | Title                                                       |
| ------------------------------------ | ----------------------------------------------------------- |
| [0027](./0027-dates-and-calendar.md) | Dates: a native field, and a Calendar for what it cannot do |
| [0028](./0028-combobox.md)           | Combobox: the first control we draw ourselves, and its cost |

## Superseded

Kept for the record — each says where its decision now lives. Nothing here is wrong; it has been folded
into a document that reads with the decisions it belongs with.

| ADR                                                     | Title                                                                 | Now in                                            |
| ------------------------------------------------------- | --------------------------------------------------------------------- | ------------------------------------------------- |
| [0001](./0001-ui-library-foundations.md)                | UI library foundations (scouting)                                     | [0002](./0002-ui-library-foundations-decision.md) |
| [0003](./0003-browser-support-baseline.md)              | Browser support: Baseline                                             | [0017](./0017-browser-platform-target.md)         |
| [0004](./0004-docs-aggregation.md)                      | Docs live in packages; the site aggregates them                       | [0020](./0020-where-things-live.md)               |
| [0005](./0005-apps-layer-not-published.md)              | `apps/` hosts non-published sites; the docs site there                | [0020](./0020-where-things-live.md)               |
| [0009](./0009-motion-css-first.md)                      | Motion is CSS-first on the tokens; no motion runtime                  | [0018](./0018-how-the-ds-ships-css.md)            |
| [0010](./0010-progressive-enhancement-beyond-widely.md) | Use everything Widely; Newly only as graceful progressive enhancement | [0017](./0017-browser-platform-target.md)         |
| [0011](./0011-cascade-layers.md)                        | DS css ships in a cascade layer; consumers override unlayered         | [0018](./0018-how-the-ds-ships-css.md)            |
| [0012](./0012-typed-tokens-at-property.md)              | Semantic tokens are `@property`-typed for interpolation               | [0018](./0018-how-the-ds-ships-css.md)            |
| [0014](./0014-one-folder-per-component.md)              | One folder per component, compound parts included                     | [0019](./0019-ui-package-organisation.md)         |
| [0015](./0015-storybook-taxonomy.md)                    | Storybook categories live in titles; docs in three levels             | [0019](./0019-ui-package-organisation.md)         |
