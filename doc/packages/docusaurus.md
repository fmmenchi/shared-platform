---
title: '@fmmenchi/docusaurus'
---

# @fmmenchi/docusaurus

Nx plugin that generates a Docusaurus site serving the repository's human docs **directly from
their source folder** — single instance, no copying, no sync, no multi-instance silos. The site
tree IS the `doc/` folder you already edit (this very site is generated with it).

## Install

```bash
pnpm add -D @fmmenchi/docusaurus
```

## Usage

```bash
# Scaffold the site (default: packages/tools/docs, serving doc/)
pnpm nx g @fmmenchi/docusaurus:site docs --title=my-repo --repoUrl=https://github.com/me/my-repo

pnpm nx run docs:start   # dev server on the live doc/ folder
pnpm nx run docs:build   # static site (CI-friendly)
```

```bash
# Scaffold a project's documentation page inside the docs tree
pnpm nx g @fmmenchi/docusaurus:project-doc @scope/my-lib
```

The sidebar is the docs tree: order and labels are controlled by the folder structure and
`_category_.json` files — by editing the docs, not the tool.

## Reference

- Source: `packages/plugins/docusaurus`
