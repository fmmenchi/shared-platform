# ADR 0004 — Docs live in the packages; the site aggregates them

- **Status:** accepted (2026-07-21)
- **Date:** 2026-07-21
- **Deciders:** Fabio Menchicchi

## Context and problem statement

Every non-trivial package documents itself (README + `AGENTS.md`), and the Docusaurus site
(`@fmmenchi/docs`) presents human docs. The original design served a single curated tree directly:
package pages were **hand-authored a second time** under `doc/packages/*.md`, separate from the
package. That duplicates each package's own docs and lets the two drift — the site page and the
package README describing the same thing, maintained in two places.

The earlier decision (recorded in the `@fmmenchi/nx-docusaurus` AGENTS.md) deliberately rejected
aggregation, citing dev-loop performance and coupling the tree to the repo layout. In practice the
duplication cost outweighed those concerns, and a proven model exists in a sibling repo (iungo).

## Decision

**Docs live with the code and the site assembles them.**

- Each project keeps its docs in its own `docs/` folder; workspace-level docs (ADRs, architecture,
  styling) stay at the `doc/` root.
- Two executors in `@fmmenchi/nx-docusaurus` do the assembly: `config-generator` discovers projects
  that ship a `docs/` folder and writes a manifest (`nx-doc-projects.json`), categorized into
  `libraries` / `plugins`; `sync-docs` copies each into `doc/{libraries,plugins}/<unscoped-name>`,
  with a continuous watch mode for the dev server. `@fmmenchi/docs` `build`/`serve` depend on them.
- `onBrokenLinks: 'throw'` — a dead cross-package link fails the build.

This supersedes the "single tree, no aggregation" design in the plugin's AGENTS.md.

## Consequences

- **Single source per package.** A package's docs are written once, next to its code, and appear on
  the site automatically. `project-doc` scaffolds `<project>/docs/index.md`.
- **The synced tree is generated**, not edited: `doc/{libraries,plugins}/*/` and the manifest are
  gitignored; only the `_category_.json` group labels are committed.
- **Cross-package links** are written against the assembled layout (`../../plugins/<name>/index.md`)
  and enforced by `onBrokenLinks: 'throw'`.
- **Trade-off accepted:** a sync step before build/serve (mitigated by nx caching + watch) and links
  coupled to the assembled layout, in exchange for removing the duplicate curated tree.
