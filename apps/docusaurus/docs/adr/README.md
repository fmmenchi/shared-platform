# Architecture Decision Records

Significant architectural decisions for this platform are recorded here as ADRs, one file per
decision, numbered sequentially: `NNNN-<kebab-title>.md`.

- **Statuses:** `draft (scouting)` → `proposed` → `accepted` | `rejected` | `superseded by NNNN`.
- A **scouting ADR** captures the problem, the decision drivers and the options to explore
  _before_ a decision exists; the decision itself lands either by updating the ADR to `accepted`
  or in a follow-up ADR that supersedes it.
- Never rewrite an accepted ADR: supersede it with a new one.

## Index

| ADR                                        | Title                                                  | Status           |
| ------------------------------------------ | ------------------------------------------------------ | ---------------- |
| [0001](./0001-ui-library-foundations.md)   | UI library foundations                                 | draft (scouting) |
| 0002                                       | _reserved_ — UI foundations decision (supersedes 0001) | pending          |
| [0003](./0003-browser-support-baseline.md) | Browser support: Baseline                              | accepted         |
| [0004](./0004-docs-aggregation.md)         | Docs live in packages; the site aggregates them        | accepted         |
| [0005](./0005-apps-layer-not-published.md) | `apps/` hosts non-published sites; the docs site there | accepted         |
