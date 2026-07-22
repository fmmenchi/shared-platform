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
architecture, styling…) live in the site's own co-located `docs/` (`apps/docusaurus/docs`). The site
is assembled by two executors, so `build`/`serve` depend on them (see
[ADR-0004](../../../apps/docusaurus/docs/adr/0004-docs-aggregation.md)).

- **`config-generator`** — scans the workspace for projects that ship a `docs/` folder (with a
  `.md`/`.mdx` or `_category_.json`) and writes `nx-doc-projects.json` in the docs app root,
  categorized into `libraries` / `plugins` (a `scope:plugins` tag → plugin). The docs app is
  skipped; applications too. Reads `context.projectsConfigurations` — the project graph IS the
  discovery.
- **`sync-docs`** — reads the manifest and copies each project's `docs/` into
  `<targetPath>/{libraries,plugins}/<unscoped-name>` (e.g. `apps/docusaurus/docs/libraries/notify`),
  replacing what was there, and writes the `<targetPath>/.gitignore` that keeps those assembled
  folders out of git — they are rebuilt on every sync, so committing them would duplicate the
  source. A continuous **watch** mode (`--watch`, async-generator executor) re-syncs on change for
  the dev server. `node:fs` only — no `fs-extra`; a JSON manifest — no runtime `.ts` import.
- **generator `project-doc`** — scaffolds `<projectRoot>/docs/index.md` from the project's
  package.json (the consistent starting point for a new page).
- **generator `site`** — scaffolds the aggregating site itself under `apps/<name>` (`scope:app`,
  default `apps/docs`): the `docusaurus.config` with `path: 'docs'`, the `config-generator` +
  `sync-docs` targets wired into `build`/`serve`, a co-located `docs/` with a landing page and the
  Libraries/Plugins `_category_.json` markers, and a `.gitignore` for the manifest.

Conventions: destination folder = the **unscoped** package name (`@fmmenchi/notify` → `notify`) so
it is unique and collision-free. Cross-package links resolve within the assembled tree
(`../../plugins/nx-notify/index.md`) and **`onBrokenLinks: 'throw'`** fails the build on any dead
link. The `_category_.json` sidebar markers (`docs/libraries`, `docs/plugins`) are committed; the
assembled `*/` subfolders — kept out of git by the `.gitignore` sync-docs writes — and
`nx-doc-projects.json` are not. The site lives in `apps/` (`scope:app`), stays `private: true`, and
`apps/` is excluded from `nx release`.

`CLAUDE.md` is a symlink to this file — edit `AGENTS.md` only.
