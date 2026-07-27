---
title: '@fmmenchi/nx-docusaurus'
sidebar_label: nx-docusaurus
sidebar_position: 0
---

# @fmmenchi/nx-docusaurus

Nx plugin that builds **one** Docusaurus site by aggregating the `docs/` folders that already live
beside each package's code — discovered from the Nx project graph, assembled at build time, never
committed twice.

## Prerequisites

- **An Nx workspace.** Every target here runs through Nx (`pnpm nx …`); discovery reads the project
  graph, so each documented project must be a resolvable Nx project.
- **The plugin installed as a dev dependency** of the workspace:

  ```bash
  pnpm add -D @fmmenchi/nx-docusaurus
  ```

- **The `doc:<category>` tag convention.** A doc-enabled project is grouped by its `doc:<category>`
  tag — the category is whatever follows `doc:` (here `client`, `shared`, `plugins`, `ops`). The
  plugin hardcodes no taxonomy; a project with `docs/` but no `doc:` tag is skipped with a warning.
  `doc:` is a dedicated docs tag, deliberately separate from the `scope:` module boundaries.
- **Nothing else.** The `site` generator adds Docusaurus 3 + React 19 to the generated site's
  `package.json`; there is no external service, CLI, or secret to provision.

## 🚀 Guides

Task recipes, start to finish:

1. [Scaffold the docs site](./guides/scaffold-the-site.md) — generate the aggregating site under
   `apps/`.
2. [Document a package](./guides/document-a-package.md) — add a `docs/` page to any library or
   plugin so it feeds the site.
3. [Build & serve the site](./guides/build-and-serve.md) — the assembly pipeline, the watch dev
   server, and CI.

## 📚 Reference

- [Executors & generators](./reference/index.md) — `config-generator`, `sync-docs`, `site`,
  `project-doc`: usage, arguments, options and defaults.

## 🏗 Concepts

- [Concepts](./concepts/index.md) — why docs live in the packages, and how the two-executor
  pipeline turns scattered `docs/` folders into one site.
