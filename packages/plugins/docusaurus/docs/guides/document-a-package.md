---
title: Document a package
sidebar_label: Document a package
sidebar_position: 2
---

# Document a package

## Intent

Give any package a `docs/` folder so `config-generator` discovers it and `sync-docs` assembles it
into the site, under the sidebar group named by the project's `doc:<category>` tag (a project with
`docs/` but no `doc:` tag is skipped with a warning).

## Step 1: Scaffold the entry page

```bash
pnpm nx g @fmmenchi/nx-docusaurus:project-doc @scope/my-lib --category=client
```

This writes `<projectRoot>/docs/index.md`, pre-filled from the project's `package.json` (`name` and
`description`), and adds the `doc:client` tag to the project — the tag is the sidebar group the page
lands in. If `docs/index.md` already exists the generator **throws** rather than overwrite it — edit
the existing page instead.

👉 [`project-doc` reference](../reference/index.md#project-doc)

:::note The `doc:` tag is what files the page

Without a `doc:<category>` tag the package is discovered but **skipped** with a warning. `--category`
adds it for you; you can also set it by hand in the project's `nx.tags`. The category must have a
matching `docs/<category>/_category_.json` marker in the site (the `site` generator scaffolds one per
`--categories` entry).

:::

### What the page looks like

```markdown
---
title: '@scope/my-lib'
---

# @scope/my-lib

<!-- One sentence: what @scope/my-lib is and when to reach for it. -->

## Install

...
```

## Step 2: Author with frontmatter

Docusaurus reads YAML frontmatter to place and index each page. The fields that matter:

| Field              | Controls                               |
| ------------------ | -------------------------------------- |
| `title`            | Page heading and search index entry.   |
| `sidebar_label`    | The name shown in the navigation tree. |
| `sidebar_position` | Sort order relative to sibling pages.  |

Add more `.md` files in the same `docs/` folder for extra pages; drop a `_category_.json` in it to
control how the whole package's sub-tree is labelled and ordered.

:::tip[`.md` stays CommonMark]

The generated site sets `markdown.format: 'detect'`, so plain `.md` files are **not** parsed as
MDX — prose with `<placeholders>` and `{braces}` renders literally. Opt into MDX explicitly by
naming a file `.mdx`.

:::

## Step 3: Keep links inside the assembled tree

Every link is checked at build time (`onBrokenLinks: 'throw'`). A link to another package must point
into the **assembled** path, not the source path — `../../<category>/<folder>/…` — for example,
from a plugin page to a shared-package page:

```markdown
See [@scope/other-lib](../../shared/other-lib/index.md).
```

## Step 4: Verify it is picked up

```bash
pnpm nx run docs:config-generator   # logs the per-category counts, e.g. "2 client, 1 shared, 4 plugins"
pnpm nx run docs:build              # assembles and builds
```

Your package now appears under Libraries or Plugins in the site. There is no list to register it in
— the Nx graph is the source of truth.

## Related

- [Build & serve the site](./build-and-serve.md) to preview with hot reload.
- [`project-doc` reference](../reference/index.md#project-doc).
- [Concepts: docs live in the package](../concepts/index.md).
