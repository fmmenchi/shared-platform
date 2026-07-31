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
  projects whose `docs/` holds a `.md`/`.mdx` or `_category_.json`. Categorises by the project's
  **`doc:<category>` tag** (taxonomy-agnostic — the category is whatever follows `doc:`; a project
  that ships `docs/` but has no `doc:` tag is skipped with a warning), sets `folder` = **unscoped**
  name (`@fmmenchi/notify` → `notify`), and writes `nx-doc-projects.json` (a `category → projects`
  map) in the site root.
- **executor `sync-docs`** — async-generator; `--targetPath` required. Reads the manifest (errors
  _"run config-generator first"_ if missing), copies each project's `docs/` into
  `<targetPath>/<category>/<folder>` replacing what was there, and writes `<targetPath>/.gitignore`
  (one sorted `<category>/*/` line per category present). `--watch` = continuous re-sync for the
  dev server. `node:fs` only (no `fs-extra`); JSON manifest, no runtime `.ts` import.
- **generator `project-doc`** — scaffolds `<projectRoot>/docs/index.md` from the project's
  package.json; **throws** if it already exists. `--category <x>` also adds the `doc:<x>` tag to the
  project (so its docs land in that sidebar group).
- **generator `site`** — scaffolds the aggregating site under `apps/<name>` (default `docs`;
  `scope:app`, `type:site`, `private: true`) with `docusaurus.config` (`path: 'docs'`,
  `onBrokenLinks: 'throw'`), a co-located `docs/` (landing page + one `<category>/_category_.json`
  marker per `--categories` entry, default `libraries,plugins`), `sidebars.ts`, `src/css/custom.css`,
  and a `.gitignore` for the manifest.

**Wired targets** (site `package.json`): `build` → `sync-docs` → `config-generator`; `start` (dev
server) → `watch-sync-docs` → `config-generator`; `serve` and `clear` (`docusaurus clear`, uncached)
standalone. Never call `config-generator` / `sync-docs` by hand — `build`/`start` pull them in.
Targets live in the **site generator's template**, never hand-added to a generated project.

## Rules

- A package joins the site by shipping a `docs/` folder **and** carrying a `doc:<category>` tag —
  the category is the sidebar group it lands in. `doc:` is a dedicated docs tag, kept separate from
  the `scope:` module boundaries. In this workspace: `doc:client`, `doc:shared`, `doc:plugins`,
  `doc:ops`.
- Destination folder = **unscoped** package name (collision-free); cross-package links must resolve
  within the assembled tree (`../../plugins/nx-docusaurus/index.md`) — `onBrokenLinks: 'throw'`
  fails the build on any dead link.
- `.md` stays CommonMark (site sets `markdown.format: 'detect'`); name a file `.mdx` to opt into MDX.
- **Tracked:** each package's source `docs/` and the site's `docs/<category>/_category_.json` markers
  (which label + position each group). **Git-ignored (rebuilt every sync):** the assembled `*/`
  subfolders and `nx-doc-projects.json`.
- The site lives in `apps/` (`scope:app`, `private: true`) → excluded from `nx release`.

`CLAUDE.md` is a symlink to this file — edit `AGENTS.md` only.
