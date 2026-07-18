# AGENTS.md — @fmmenchi/docusaurus

Nx plugin: scaffold a Docusaurus site that serves the repo's human docs (`doc/`) DIRECTLY. Part of
`shared-platform`; workspace contract in [../../../AGENTS.md](../../../AGENTS.md). Scope
`plugins`, type `plugin`.

## Commands

```bash
pnpm nx typecheck @fmmenchi/docusaurus
pnpm nx build @fmmenchi/docusaurus
pnpm nx lint @fmmenchi/docusaurus
pnpm nx test @fmmenchi/docusaurus   # node vitest (Tree-based generator specs)
```

## Design (deliberate, from experience)

- **Single content-docs instance reading the source folder directly** (`docs.path` → `doc/`,
  `routeBasePath: '/'`). NO multi-instance (per-package silos: split sidebars, broken cross links,
  config explosion) and NO copy/sync aggregation (terrible dev-loop performance, tree held hostage
  by the repo layout). The site tree IS `doc/` — curated by editing the docs themselves
  (`_category_.json` for labels/order).
- **No nx project graph** anywhere: discovery is not needed when the docs are already centralized.
- Targets are plain `nx:run-commands` around the Docusaurus CLI (start/build/serve) — no custom
  executors, no CLI flag-mapping to maintain.
- `markdown.format: 'detect'` — `.md` stays CommonMark (prose with `<placeholders>`/braces must not
  parse as JSX); `.mdx` opts in. Broken repo-relative links (AGENTS.md, sources) warn, not fail.
- The generated site is `private: true`, excluded from `nx release` (`!packages/tools/docs` in
  nx.json), with `.docusaurus`/`build` gitignored.
- The generator writes a `doc/index.md` landing ONLY if the docs folder has no index/README.

`CLAUDE.md` is a symlink to this file — edit `AGENTS.md` only.
