# ADR 0005 — `apps/` hosts non-published sites; the docs site lives there

- **Status:** accepted (2026-07-22)
- **Date:** 2026-07-22
- **Deciders:** Fabio Menchicchi

## Context and problem statement

The workspace's founding principle is "abstract layers only — no apps, no services" ([the
architecture doc](../architecture.md)): everything under `packages/` is an independent library,
versioned and published per package to GitHub Packages.

The Docusaurus documentation site is a real, buildable, deployable **application**, not a library.
It was parked under `packages/tools/docs` and kept out of releases with an explicit
`!packages/tools/docs` exclusion in `nx.json` `release.projects`. That worked, but it strained the
model: a site sat in the `packages/*` tree that is otherwise "publishable layers", and the release
config carried a special-case exclusion for it. As more non-published, workspace-internal artifacts
appear, "a site pretending to be a package" scales badly.

## Decision

Introduce a top-level **`apps/`** directory with a new tag **`scope:app`** for
workspace-internal, **non-published** applications, and move the docs site to
`apps/docusaurus` (project name kept as `@fmmenchi/docs`).

- **`packages/` = the published surface** (releasable layers). **`apps/` = not published.** The
  release set (`nx.json` `release.projects`) is `packages/*/*` — `apps/` is outside that glob, so
  the site is excluded structurally, and the old `!packages/tools/docs` special case is gone.
- **Boundaries.** `scope:app` may depend on any layer it needs (an app is the top of the graph);
  nothing depends on `apps/`. Enforced by `@nx/enforce-module-boundaries`.
- **Docs are co-located in the app.** The workspace's human docs (this ADR set, architecture,
  styling…) live in `apps/docusaurus/docs/`; per-package docs stay in each package's `docs/` and
  are assembled in by the `@fmmenchi/nx-docusaurus` executors (see
  [ADR-0004](./0004-docs-aggregation.md)).

This refines "no apps" to its real intent: **no _product_ apps or services in the published
layers.** Internal infrastructure that happens to be an app (the docs site) has a home that says so.

## Consequences

- The founding principle is reworded from "no apps" to "no product apps; the internal docs site
  lives in `apps/` and is not published" across `AGENTS.md`, the architecture docs (human + agent),
  and the `@fmmenchi/nx-docusaurus` docs.
- A future non-published app (e.g. a demo/playground) has a clear, boundary-checked home and needs
  no release-config surgery.
- The one-off release exclusion is retired; the release set is the clean `packages/*/*`.
