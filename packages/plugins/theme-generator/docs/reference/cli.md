---
title: Generators & executor
sidebar_label: CLI
sidebar_position: 1
---

# Generators & executor reference

Every generator and executor in `@fmmenchi/nx-theme-generator`, with its real arguments, options and
defaults.

---

## Generators

### `theme`

Scaffolds a complete `[data-theme='<name>']` preset — every color role — instantiated from the
installed `@fmmenchi/tokens` contract, then (unless `--skipValidation`) calls the `validation`
generator to wire the `validate-themes` target. The file is written to
`<projectRoot>/<directory>/<name>.css`.

**Usage**

```bash
pnpm nx g @fmmenchi/nx-theme-generator:theme <name> --project=<project> [options]
```

#### Arguments

| Argument | Type     | Description                                                                                |
| :------- | :------- | :----------------------------------------------------------------------------------------- |
| `name`   | `string` | **Required.** Theme name — becomes the `data-theme` value. Must match `^[a-z][a-z0-9-]*$`. |

#### Options

| Option             | Type      | Default      | Description                                                                                                    |
| :----------------- | :-------- | :----------- | :------------------------------------------------------------------------------------------------------------- |
| `--project`        | `string`  | **Required** | The project the theme belongs to (gets the `validate-themes` target).                                          |
| `--directory`      | `string`  | `src/themes` | Directory for the theme file, relative to the project root.                                                    |
| `--skipValidation` | `boolean` | `false`      | Do not wire the `validate-themes` target.                                                                      |
| `--tokensPath`     | `string`  | _(auto)_     | Advanced: explicit path to `@fmmenchi/tokens`' `vars.css`, when it cannot be resolved from the workspace root. |

:::tip[Interactive prompts]

`name` and `project` are prompted for when omitted (`What is the theme name (data-theme value)?` / `Which project owns
the theme?`), so `nx g @fmmenchi/nx-theme-generator:theme` with no arguments still works.

:::

---

### `validation`

Adds (or updates) a `validate-themes` target on a project, pointing it at the `validate` executor
and registering the given theme CSS paths in its options. Called automatically by `theme`; use it
directly to register hand-written theme files. Idempotent — re-running merges and dedupes the theme
list (the stored list is deduplicated and sorted).

**Usage**

```bash
pnpm nx g @fmmenchi/nx-theme-generator:validation <project> [options]
```

#### Arguments

| Argument  | Type     | Description                                     |
| :-------- | :------- | :---------------------------------------------- |
| `project` | `string` | **Required.** The project that owns the themes. |

#### Options

| Option     | Type       | Default | Description                                     |
| :--------- | :--------- | :------ | :---------------------------------------------- |
| `--themes` | `string[]` | `[]`    | Workspace-relative theme CSS paths to register. |

---

## Executors

### `validate`

Validates one or more `[data-theme]` CSS files against the **installed** `@fmmenchi/tokens`
contract. For each file it parses the `--fm-color-*` declarations and runs the contract's
`validateTheme()` (a dynamic import of the `@fmmenchi/tokens/validate` subpath). The target fails if
any file has a violation; it prints `✓ <path> — allowed theme` per passing file and
`✗ <path> is NOT an allowed theme:` with one line per violation otherwise.

**Usage**

```bash
pnpm nx run <project>:validate-themes
```

The `validate-themes` target is the one wired by the `theme` / `validation` generators:

```jsonc
"validate-themes": {
  "executor": "@fmmenchi/nx-theme-generator:validate",
  "options": {
    "themes": ["apps/web/src/themes/acme.css"]
  }
}
```

#### Options

| Option       | Type       | Default      | Description                                                                                                           |
| :----------- | :--------- | :----------- | :-------------------------------------------------------------------------------------------------------------------- |
| `themes`     | `string[]` | **Required** | Workspace-relative paths of the theme CSS files to validate.                                                          |
| `tokensPath` | `string`   | _(auto)_     | Advanced: explicit path to `@fmmenchi/tokens`' `validate` module, when it cannot be resolved from the workspace root. |

#### What `validateTheme` checks

Each file must be:

- **complete** — every color role assigned, no unknown roles (`missing color role` /
  `unknown color role`);
- **parsable** — every value is a real color, not a `var()` reference (`is not a parsable color`);
- **inside the sRGB gamut** — no out-of-gamut values (`is outside the sRGB gamut`);
- **accessible** — WCAG contrast on every declared pair: `4.5:1` for text pairings, `3:1` for
  non-text pairings (focus ring, invalid signal, tinted alert borders). `-disabled` pairings are
  exempt. Failures report the measured ratio, e.g. `primary × primary-foreground: 3.91 < 4.5`.

---

## Build target

The plugin's own `build` target compiles it with `@nx/js:tsc`; it is workspace tooling, not part of
the plugin's public generator/executor surface.
