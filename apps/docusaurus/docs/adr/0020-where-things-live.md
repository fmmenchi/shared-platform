# ADR 0020 — Where things live: `packages/` is the published surface, `apps/` is not, docs sit with the code

- **Status:** accepted (2026-07-30) — consolidates [ADR-0004](./0004-docs-aggregation.md) and [ADR-0005](./0005-apps-layer-not-published.md)
- **Date:** 2026-07-30
- **Deciders:** Fabio Menchicchi

> Supersedes 0004 and 0005, whose text stands unchanged for the record. Neither decision is reversed:
> they are the two halves of one question — where a thing lives, and how it reaches a reader.

## Context and problem statement

The workspace's founding principle is _abstract layers only_: everything under `packages/` is an
independent library, versioned and published per package. Two things strained it.

**A site pretending to be a package.** The Docusaurus documentation site is a real, buildable,
deployable application. It sat under `packages/tools/docs` and was kept out of releases by an explicit
`!packages/tools/docs` exclusion — which worked, and scaled badly: as more non-published internal
artifacts appear, the release config accumulates special cases for things that were never layers.

**Docs written twice.** Every non-trivial package documents itself, and the site presented package
pages that were **hand-authored a second time** under `doc/packages/*.md`. Two descriptions of the
same thing, in two places, drifting. An earlier decision had deliberately rejected aggregation on
dev-loop and coupling grounds; in practice the duplication cost more than either.

## Decision

### `packages/` is the published surface; `apps/` is not

A top-level **`apps/`** directory with the tag **`scope:app`** holds workspace-internal,
**non-published** applications. The docs site moved there as `apps/docusaurus` (project name kept as
`@fmmenchi/docs`).

- The release set is the clean glob `packages/*/*`. `apps/` sits outside it, so exclusion is
  **structural** rather than a special case, and the old `!packages/tools/docs` line is retired.
- **Boundaries:** `scope:app` may depend on any layer it needs — an app is the top of the graph — and
  nothing depends on `apps/`. Enforced by `@nx/enforce-module-boundaries`.

This refines "no apps" to its actual intent: **no _product_ apps or services in the published layers.**
Internal infrastructure that happens to be an app now has a home that says so, and a future
demo or playground needs no release-config surgery.

### Docs live with the code; the site assembles them

- Each project keeps its docs in its own `docs/` folder. Workspace-level docs — this ADR set,
  architecture, styling — live in `apps/docusaurus/docs/`.
- Two executors in `@fmmenchi/nx-docusaurus` do the assembly: `config-generator` discovers projects
  shipping a `docs/` folder and writes a manifest, categorised into `libraries` / `plugins`;
  `sync-docs` copies each into `doc/{libraries,plugins}/<unscoped-name>`, with a watch mode for the
  dev server. The site's `build` and `serve` depend on them.
- **The synced tree is generated, not edited** — it is gitignored; only the `_category_.json` group
  labels are committed.
- `onBrokenLinks: 'throw'`: a dead cross-package link fails the build.

## Consequences

- **One source per package.** A package's docs are written once, next to its code, and appear on the
  site automatically.
- **Cross-package links are written against the assembled layout** (`../../plugins/<name>/index.md`)
  and enforced at build time.
- **Trade-off accepted:** a sync step before build and serve — mitigated by Nx caching and watch mode —
  and links coupled to the assembled layout, in exchange for removing the duplicate tree.
- The founding principle is worded as "no product apps; the internal docs site lives in `apps/` and is
  not published" across `AGENTS.md`, the architecture docs and the plugin's own.
