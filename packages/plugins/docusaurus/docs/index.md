---
title: '@fmmenchi/nx-docusaurus'
---

# @fmmenchi/nx-docusaurus

Nx plugin that builds a single Docusaurus site which **aggregates per-package docs**. Each package's
docs live beside its code in a `docs/` folder; the plugin discovers them and assembles them into the
site at build time — no second copy to maintain, no drift between a package's README and its site page.

## Install

```bash
pnpm add -D @fmmenchi/nx-docusaurus
```

## How it works

Two executors run before the Docusaurus build (the site's `build`/`serve` depend on them):

- **`config-generator`** — scans the workspace for projects that ship a `docs/` folder and writes a
  manifest, categorising each as a library or a plugin (a `scope:plugins` tag → plugin).
- **`sync-docs`** — copies each package's `docs/` into the site's `docs/{libraries,plugins}/<name>`,
  and writes the `.gitignore` that keeps those assembled folders out of git (they are rebuilt on
  every sync, so committing them would duplicate the source). A `--watch` mode re-syncs for the dev
  server.

Workspace-level docs (ADRs, architecture, styling) are authored directly in the site's co-located
`docs/`. The site is a non-published app under `apps/`.

## Scaffold a package's docs page

```bash
pnpm nx g @fmmenchi/nx-docusaurus:project-doc @scope/my-lib   # writes <project>/docs/index.md
```

## Reference

- Source: `packages/plugins/docusaurus`
