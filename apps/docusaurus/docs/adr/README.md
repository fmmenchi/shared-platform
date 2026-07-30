# Architecture Decision Records

Significant architectural decisions for this platform are recorded here as ADRs, one file per
decision, numbered sequentially: `NNNN-<kebab-title>.md`.

- **Statuses:** `draft (scouting)` → `proposed` → `accepted` | `rejected` | `superseded by NNNN`.
- A **scouting ADR** captures the problem, the decision drivers and the options to explore
  _before_ a decision exists; the decision itself lands either by updating the ADR to `accepted`
  or in a follow-up ADR that supersedes it.
- Never rewrite an accepted ADR: supersede it with a new one.

## Index

| ADR                                                     | Title                                                                 | Status           |
| ------------------------------------------------------- | --------------------------------------------------------------------- | ---------------- |
| [0001](./0001-ui-library-foundations.md)                | UI library foundations                                                | draft (scouting) |
| 0002                                                    | _reserved_ — UI foundations decision (supersedes 0001)                | pending          |
| [0003](./0003-browser-support-baseline.md)              | Browser support: Baseline                                             | accepted         |
| [0004](./0004-docs-aggregation.md)                      | Docs live in packages; the site aggregates them                       | accepted         |
| [0005](./0005-apps-layer-not-published.md)              | `apps/` hosts non-published sites; the docs site there                | accepted         |
| [0006](./0006-absorb-ui-ports.md)                       | Absorb `@fmmenchi/ui-ports` into `@fmmenchi/ui`                       | accepted         |
| [0007](./0007-security-scanning-workspace-level.md)     | Security scanning is workspace-level                                  | accepted         |
| [0008](./0008-cross-app-framework-agnostic-layers.md)   | What earns a place as a shared layer (cross-app + framework-agnostic) | accepted         |
| [0009](./0009-motion-css-first.md)                      | Motion is CSS-first on the tokens; no motion runtime                  | accepted         |
| [0010](./0010-progressive-enhancement-beyond-widely.md) | Use everything Widely; Newly only as graceful progressive enhancement | accepted         |
| [0011](./0011-cascade-layers.md)                        | DS css ships in a cascade layer; consumers override unlayered         | accepted         |
| [0012](./0012-typed-tokens-at-property.md)              | Semantic tokens are `@property`-typed for interpolation               | accepted         |
| [0013](./0013-form-controls-contract.md)                | Form controls are transparent native controls; validation stays out   | accepted         |
| [0014](./0014-one-folder-per-component.md)              | One folder per component, compound parts included                     | accepted         |
| [0015](./0015-storybook-taxonomy.md)                    | Storybook categories live in titles; docs in three levels             | accepted         |
| [0016](./0016-minimal-semantic-markup.md)               | Markup is minimal and semantic; an element must earn its place        | accepted         |
