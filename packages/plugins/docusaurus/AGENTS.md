# AGENTS.md — @fmmenchi/nx-docusaurus

Nx plugin: scaffold a Docusaurus site AND aggregate per-package docs into it. Part of
`shared-platform`; workspace contract in [../../../AGENTS.md](../../../AGENTS.md). Scope
`plugins`, type `plugin`.

## Commands

```bash
pnpm nx typecheck @fmmenchi/nx-docusaurus
pnpm nx build @fmmenchi/nx-docusaurus
pnpm nx lint @fmmenchi/nx-docusaurus
pnpm nx test @fmmenchi/nx-docusaurus   # node vitest (Tree-based generator specs)
```

## Design — docs live in the packages, the site aggregates them

Per-package docs live in each project's `docs/` folder (with the code); workspace docs (ADRs,
architecture, styling…) live at the `doc/` root. The site is assembled by two executors, so
`build`/`serve` depend on them (see [ADR-0004](../../../doc/adr/0004-docs-aggregation.md)).

- **`config-generator`** — scans the workspace for projects that ship a `docs/` folder (with a
  `.md`/`.mdx` or `_category_.json`) and writes `nx-doc-projects.json` in the docs app root,
  categorized into `libraries` / `plugins` (a `scope:plugins` tag → plugin). The docs app is
  skipped; applications too (there are none here). Reads `context.projectsConfigurations` — the
  project graph IS the discovery.
- **`sync-docs`** — reads the manifest and copies each project's `docs/` into
  `<targetPath>/{libraries,plugins}/<unscoped-name>` (e.g. `doc/libraries/notify`), replacing what
  was there. A continuous **watch** mode (`--watch`, async-generator executor) re-syncs on change
  for the dev server. `node:fs` only — no `fs-extra`; a JSON manifest — no runtime `.ts` import.
- **generator `project-doc`** — scaffolds `<projectRoot>/docs/index.md` from the project's
  package.json (the consistent starting point for a new page).
- **generator `site`** — scaffolds the Docusaurus site itself.

Conventions: destination folder = the **unscoped** package name (`@fmmenchi/notify` → `notify`) so
it is unique and collision-free. Cross-package links resolve within the assembled tree
(`../../plugins/nx-notify/index.md`) and **`onBrokenLinks: 'throw'`** fails the build on any dead
link. `_category_.json` at `doc/libraries` / `doc/plugins` labels the sidebar groups (committed;
the synced `*/` subfolders and `nx-doc-projects.json` are gitignored). The site is `private: true`,
excluded from `nx release`.

`CLAUDE.md` is a symlink to this file — edit `AGENTS.md` only.
