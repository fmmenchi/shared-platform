# @fmmenchi/docusaurus

Nx plugin: generate a Docusaurus site that serves the repository's human docs **directly from
their source folder** — no copying, no sync, no multi-instance silos. The site tree is the `doc/`
folder you already edit; the dev server watches it natively.

```bash
pnpm add -D @fmmenchi/docusaurus
pnpm nx g @fmmenchi/docusaurus:site docs --title="my-repo" --repoUrl=https://github.com/me/my-repo
pnpm nx run docs:start    # dev server on the live doc/ folder
pnpm nx run docs:build    # static site (CI-friendly)
```

Options: `--docPath` (default `doc`), `--directory` (default `packages/tools/<name>`),
`--packageName`, `--title`, `--url`, `--repoUrl`.

- **Scope / type:** `plugins` / `plugin`
- **Workspace:** part of [shared-platform](../../../README.md) — released independently to GitHub Packages.
- **Agent entrypoint:** [AGENTS.md](./AGENTS.md).
