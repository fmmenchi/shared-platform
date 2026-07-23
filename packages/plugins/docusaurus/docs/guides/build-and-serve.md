---
title: Build & serve the site
sidebar_label: Build & serve
sidebar_position: 3
---

# Build & serve the site

## Intent

Run the assembly pipeline — locally with a live-reloading dev server, and in CI for a static build.
You drive it entirely through the site's `start` and `build` targets; the two executors are pulled
in as dependencies.

## The pipeline at a glance

```
config-generator  →  writes nx-doc-projects.json
        ↓
sync-docs         →  copies each docs/ into docs/{libraries,plugins}/<name>
        ↓                              + writes docs/.gitignore
docusaurus        →  build / start over the assembled tree
```

## Step 1: Develop with hot reload

```bash
pnpm nx run docs:start
```

`start` depends on `watch-sync-docs`, a **continuous** executor: after the first assembly it keeps
running, watches every source `docs/` folder, and re-syncs the one that changed. Edit a page in any
package's `docs/` and the dev server reloads it.

:::tip[Manifest first]

`sync-docs` reads `nx-doc-projects.json` and errors with _"run config-generator first"_ if it is
missing. Both `sync-docs` and `watch-sync-docs` already `dependsOn: ["config-generator"]`, so this
only surfaces if you invoke `sync-docs` directly — run `config-generator` before it.

:::

## Step 2: Build for CI / deploy

```bash
pnpm nx run docs:build
```

`build` depends on `sync-docs` (which depends on `config-generator`), so one command assembles the
whole tree and produces the static site in `apps/<name>/build`. Because the site sets
`onBrokenLinks: 'throw'`, any dead cross-package link **fails the build** — the check is your
regression net.

## Step 3: Wire it into CI

Run it as part of the workspace gate, letting Nx skip it when nothing relevant changed:

```bash
pnpm nx run-many -t build            # includes the docs site's build
# or, change-scoped:
pnpm nx affected -t build
```

The assembled folders and the manifest are git-ignored (`sync-docs` writes
`docs/.gitignore`; the `site` generator's `.gitignore` covers `nx-doc-projects.json`), so a clean CI
checkout rebuilds them from source every run — nothing to commit, nothing to drift.

## Related

- [Scaffold the docs site](./scaffold-the-site.md) — the targets this guide runs.
- [Executors reference](../reference/index.md#executors) — `config-generator` and `sync-docs`
  options.
- [Concepts: the assembly pipeline](../concepts/index.md).
