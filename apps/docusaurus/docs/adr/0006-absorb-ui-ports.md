# ADR 0006 — Absorb `@fmmenchi/ui-ports` into `@fmmenchi/ui`

- **Status:** accepted (2026-07-22)
- **Date:** 2026-07-22
- **Deciders:** Fabio Menchicchi

## Context and problem statement

[ADR-0001](./0001-ui-library-foundations.md) split the design system into three packages, isolating
the injection-port contracts (`UiAdapters`, `I18n`, `LinkComponent`…) into `@fmmenchi/ui-ports` — a
zero-runtime, types-only package. The stated benefit: an app could write its adapters "without
importing the component library."

In practice `@fmmenchi/ui-ports` has a **single importer** — `@fmmenchi/ui` (its `UiProvider`). No
other package, and no external consumer, depends on the ports directly. And the "without importing
the component library" benefit does not need a separate package: the ports are **types**, imported
with `import type`, which is **erased at build**. `import type { UiAdapters } from '@fmmenchi/ui'`
pulls in zero component runtime. So the split was a preemptive abstraction with no second consumer —
against the workspace's own rule that a package earns its scope on the first _real_ cross-side
dependency, never preemptively.

## Decision

Absorb `@fmmenchi/ui-ports` into `@fmmenchi/ui`.

- The port interfaces move to `@fmmenchi/ui`'s `src/i18n/ports.types.ts` and are **re-exported from
  its barrel**; a consumer types its adapters with `import type { UiAdapters } from '@fmmenchi/ui'`.
- `@fmmenchi/ui-ports` is deleted and dropped from the publish set.

Reversible: if a genuine non-`ui` consumer of the ports appears, `nx g move` re-extracts the contract
into its own package cheaply.

## Consequences

- One fewer package to version, publish, and document; `@fmmenchi/ui`'s public `.d.ts` no longer
  references an external port package.
- Consumers import both the components and the adapter contract from a single package.
- The design system becomes two packages (`tokens` + `ui`); this ADR **supersedes that aspect of
  ADR-0001** (which stays as the historical record of the original three-package spike).
