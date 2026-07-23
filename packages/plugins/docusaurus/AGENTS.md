# AGENTS.md — @fmmenchi/nx-docusaurus

Nx plugin: scaffold **one** Docusaurus site AND aggregate every package's own `docs/` folder into it
(discovered from the Nx project graph, assembled at build time, never committed twice). Part of
`shared-platform`; workspace contract in [../../../AGENTS.md](../../../AGENTS.md). Scope `plugins`,
type `plugin`.

Long-form docs (concepts, guides, executor/generator reference) live in [`docs/`](./docs/index.md) —
read there for rationale and full option tables; keep this file terse and do not duplicate it.

## Commands

```bash
pnpm nx typecheck @fmmenchi/nx-docusaurus
pnpm nx build @fmmenchi/nx-docusaurus
pnpm nx lint @fmmenchi/nx-docusaurus
pnpm nx test @fmmenchi/nx-docusaurus   # node vitest (Tree-based generator specs)
```

## Shape — two executors, two generators

Full reference: [`docs/reference`](./docs/reference/index.md). Design: ADR-0004 +
[`docs/concepts`](./docs/concepts/index.md).

- **executor `config-generator`** — no options; must run in the site project's context. Walks
  `context.projectsConfigurations.projects`, skips the docs site itself and any `application`, keeps
  projects whose `docs/` holds a `.md`/`.mdx` or `_category_.json`. Categorises by tag
  (`scope:plugins` → `plugins`, else `libraries`), sets `folder` = **unscoped** name
  (`@fmmenchi/notify` → `notify`), and writes `nx-doc-projects.json` in the site root.
- **executor `sync-docs`** — async-generator; `--targetPath` required. Reads the manifest (errors
  _"run config-generator first"_ if missing), copies each project's `docs/` into
  `<targetPath>/{libraries,plugins}/<folder>` replacing what was there, and writes
  `<targetPath>/.gitignore` (`libraries/*/`, `plugins/*/`). `--watch` = continuous re-sync for the
  dev server. `node:fs` only (no `fs-extra`); JSON manifest, no runtime `.ts` import.
- **generator `project-doc`** — scaffolds `<projectRoot>/docs/index.md` from the project's
  package.json; **throws** if it already exists.
- **generator `site`** — scaffolds the aggregating site under `apps/<name>` (default `docs`;
  `scope:app`, `type:site`, `private: true`) with `docusaurus.config` (`path: 'docs'`,
  `onBrokenLinks: 'throw'`), a co-located `docs/` (landing page + Libraries/Plugins
  `_category_.json` markers), `sidebars.ts`, `src/css/custom.css`, and a `.gitignore` for the
  manifest.

**Wired targets** (site `package.json`): `build` → `sync-docs` → `config-generator`; `start` (dev
server) → `watch-sync-docs` → `config-generator`; `serve` standalone. Never call `config-generator`
/ `sync-docs` by hand — `build`/`start` pull them in.

## Rules

- Destination folder = **unscoped** package name (collision-free); cross-package links must resolve
  within the assembled tree (`../../plugins/nx-docusaurus/index.md`) — `onBrokenLinks: 'throw'`
  fails the build on any dead link.
- `.md` stays CommonMark (site sets `markdown.format: 'detect'`); name a file `.mdx` to opt into MDX.
- **Tracked:** each package's source `docs/` and the site's `docs/{libraries,plugins}/_category_.json`
  markers. **Git-ignored (rebuilt every sync):** the assembled `*/` subfolders and
  `nx-doc-projects.json`.
- The site lives in `apps/` (`scope:app`, `private: true`) → excluded from `nx release`.

`CLAUDE.md` is a symlink to this file — edit `AGENTS.md` only.
