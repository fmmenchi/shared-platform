---
title: Reference
sidebar_label: Executors & generators
sidebar_position: 1
---

# Reference

Every executor and generator in `@fmmenchi/nx-docusaurus`, with real usage, arguments, options and
defaults. Invoke names are `@fmmenchi/nx-docusaurus:<executor|generator>`.

---

## Generators

### `site`

Scaffold the aggregating Docusaurus site — a non-published app under `apps/` whose `build`/`start`
targets are wired to the assembly executors.

**Usage**

```bash
pnpm nx g @fmmenchi/nx-docusaurus:site <name> [options]
```

#### Arguments

| Argument | Type     | Description                                                              |
| :------- | :------- | :----------------------------------------------------------------------- |
| `name`   | `string` | **Required.** Project directory basename (argv index 0). Default `docs`. |

#### Options

| Option          | Type     | Default                 | Description                                                 |
| :-------------- | :------- | :---------------------- | :---------------------------------------------------------- |
| `--directory`   | `string` | `apps/<name>`           | Workspace-relative directory of the site project.           |
| `--packageName` | `string` | `<name>`                | `package.json` name of the site project.                    |
| `--title`       | `string` | `<name>`                | Site title (navbar / browser).                              |
| `--url`         | `string` | `http://localhost:3000` | Production URL of the site.                                 |
| `--baseUrl`     | `string` | `/`                     | Base URL path (GitHub Pages project sites need `/<repo>/`). |
| `--repoUrl`     | `string` | `https://github.com`    | Repository URL for the navbar GitHub link.                  |

**Generates** `docusaurus.config.ts`, `sidebars.ts`, `package.json` (tagged `scope:app`,
`type:site`, `private: true`), `src/css/custom.css`, a co-located `docs/` with `index.md` and the
`libraries` / `plugins` `_category_.json` markers, and a `.gitignore`. It also appends `build` and
`.docusaurus` to the workspace `.prettierignore` when present. The generated `package.json` wires
these targets: `config-generator`, `sync-docs`, `watch-sync-docs`, `start` (`docusaurus start`),
`build` (`docusaurus build`), `serve` (`docusaurus serve`).

---

### `project-doc`

Scaffold a package's in-package documentation entry page at `<projectRoot>/docs/index.md`,
pre-filled from that project's `package.json`.

**Usage**

```bash
pnpm nx g @fmmenchi/nx-docusaurus:project-doc <project>
```

#### Arguments

| Argument  | Type     | Description                                                               |
| :-------- | :------- | :------------------------------------------------------------------------ |
| `project` | `string` | **Required.** The project to document (argv index 0; prompts if omitted). |

Throws if `<projectRoot>/docs/index.md` already exists — edit the page instead of regenerating.

---

## Executors

### `config-generator`

Scans the Nx project graph for projects that ship a `docs/` folder and writes the manifest the
sync step reads. **Takes no options.** Must run in the site project's context (it uses that
project's root as the manifest destination and skips it from discovery).

**Usage**

```bash
pnpm nx run <site>:config-generator
```

**Behaviour**

- Walks `context.projectsConfigurations.projects`; skips the docs site itself and any project of
  type `application`.
- Keeps a project only if `<root>/docs/` exists and contains a `_category_.json` **or** at least one
  `.md`/`.mdx` file.
- Categorises: tag `scope:plugins` → `plugins`, otherwise `libraries`. Destination `folder` is the
  unscoped project name (`@fmmenchi/notify` → `notify`).
- Writes `nx-doc-projects.json` in the site project's root and logs the library/plugin counts.

### `sync-docs`

Assembles the site: reads `nx-doc-projects.json` and copies each listed project's `docs/` into the
target tree. An async-generator executor, so it also runs as a continuous watcher.

**Usage**

```bash
pnpm nx run <site>:sync-docs --targetPath=apps/docs/docs
```

#### Options

| Option         | Type      | Required | Default | Description                                                  |
| :------------- | :-------- | :------- | :------ | :----------------------------------------------------------- |
| `--targetPath` | `string`  | **Yes**  | —       | Where to assemble the docs, relative to the workspace root.  |
| `--watch`      | `boolean` | No       | `false` | Keep running and re-sync on filesystem changes (dev server). |

**Behaviour**

- Errors if `nx-doc-projects.json` is missing (_"run config-generator first"_).
- Creates `<targetPath>` and writes `<targetPath>/.gitignore` (`libraries/*/`, `plugins/*/`).
- Copies each project's `docs/` into `<targetPath>/{libraries,plugins}/<folder>`, replacing what was
  there.
- With `--watch`, watches each source `docs/` folder recursively and re-syncs the changed project
  until `SIGINT`/`SIGTERM`.

---

## The manifest — `nx-doc-projects.json`

`config-generator` writes it; `sync-docs` reads it. Shape:

```json
{
  "libraries": [
    {
      "name": "@fmmenchi/notify",
      "root": "packages/shared/notify",
      "folder": "notify",
      "type": "library"
    }
  ],
  "plugins": [
    {
      "name": "@fmmenchi/nx-docusaurus",
      "root": "packages/plugins/docusaurus",
      "folder": "nx-docusaurus",
      "type": "plugin"
    }
  ]
}
```

It is generated on every build and git-ignored — never edit it by hand.

## See also

- [Guides](../guides/scaffold-the-site.md) for task-oriented walkthroughs.
- [Concepts](../concepts/index.md) for the design behind the pipeline.
