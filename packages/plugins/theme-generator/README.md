# @fmmenchi/nx-theme-generator

Nx plugin for `@fmmenchi/ui` brand themes: **scaffold a complete theme from the tokens contract
you have installed, and gate it in CI** — one command wires both.

A theme is a complete assignment of every color role of `@fmmenchi/tokens` under a
`[data-theme='<name>']` selector. Writing one by hand invites two failure modes: missing roles
(silently unstyled components) and values that break accessibility. This plugin removes both: the
scaffold is **instantiated at generation time from the `@fmmenchi/tokens` version installed in
your workspace** (it cannot drift from your contract), and the generated `validate-themes` target
re-validates every theme on each CI run.

## Install

```bash
pnpm add -D @fmmenchi/nx-theme-generator
```

Requires `@fmmenchi/tokens` in the workspace (resolved at run time — the plugin bundles nothing).

## Quick start

```bash
# Scaffold a theme into an existing project and wire its validation
pnpm nx g @fmmenchi/nx-theme-generator:theme acme --project=web

# Validate (this is what CI runs)
pnpm nx run web:validate-themes
```

Then import the file with your styles and apply it:

```html
<html data-theme="acme"></html>
```

## Generator: `theme`

Scaffolds `<projectRoot>/<directory>/<name>.css` — every color role, starting from the light
reference values — then calls the `validation` generator to register it in the project's
`validate-themes` target.

```bash
pnpm nx g @fmmenchi/nx-theme-generator:theme <name> --project=<project> [options]
```

| Option             | Type      | Default      | Description                                                               |
| ------------------ | --------- | ------------ | ------------------------------------------------------------------------- |
| `name`             | `string`  | _(required)_ | Theme name — becomes the `data-theme` value (`^[a-z][a-z0-9-]*$`).        |
| `--project`        | `string`  | _(required)_ | Existing project that owns the theme (gets the `validate-themes` target). |
| `--directory`      | `string`  | `src/themes` | Directory for the file, relative to the project root.                     |
| `--skipValidation` | `boolean` | `false`      | Don't wire the `validate-themes` target.                                  |
| `--tokensPath`     | `string`  | _(auto)_     | Advanced: explicit path to the tokens' `vars.css` (see Troubleshooting).  |

**Editing workflow:** change the values, never remove a role, re-run `validate-themes`. The
generator never creates a project — a theme is a file plus a gate; it belongs to an existing app
or lib.

## Generator: `validation`

Wires (or updates) the `validate-themes` target on a project. Called automatically by `theme`;
use it directly to register hand-written theme files:

```bash
pnpm nx g @fmmenchi/nx-theme-generator:validation web --themes=apps/web/src/themes/legacy.css
```

Idempotent: re-running merges and dedupes the theme list.

## Executor: `validate`

```jsonc
// added to the project automatically
"validate-themes": {
  "executor": "@fmmenchi/nx-theme-generator:validate",
  "options": { "themes": ["apps/web/src/themes/acme.css"] }
}
```

For each file it parses the `--fm-color-*` declarations and runs the `validateTheme()` of the
**installed** `@fmmenchi/tokens` (dynamic import of `@fmmenchi/tokens/validate`). A theme passes
only if it is:

- **complete** — every color role assigned, no unknown roles;
- **parsable** — every value is a real color;
- **inside the sRGB gamut** — out-of-gamut values render differently per browser and falsify
  contrast math;
- **accessible** — WCAG contrast on every pairing the design system uses (text 4.5:1, focus
  ring/invalid 3:1; `-disabled` pairs exempt).

Failure output reports the exact numbers — fix the value, don't lower the bar:

```
✗ apps/web/src/themes/acme.css is NOT an allowed theme:
  primary × primary-foreground: 3.91 < 4.5
  missing color role "ring"
```

## Why it can't drift

Nothing is bundled: both the scaffold source (`vars.css`) and the validator (`validateTheme`) are
resolved **at run time from your workspace's installed `@fmmenchi/tokens`**. Upgrade tokens and
the next generation/validation follows the new contract automatically — if the upgrade added a
role, `validate-themes` fails until your themes assign it.

## Troubleshooting

- **`Could not resolve @fmmenchi/tokens from the workspace root`** — the package is installed in a
  sub-package of your monorepo rather than hoisted. Pass the path explicitly:
  `--tokensPath=<path to @fmmenchi/tokens>/src/styles/vars.css` (generator) or set `tokensPath`
  in the target options (executor).
- **A pair fails after editing** — move the value's _lightness_ (keep the hue, scale the chroma)
  until the reported ratio passes; that preserves the colour identity while restoring contrast.

---

- **Scope / type:** `plugins` / `plugin`
- **Workspace:** part of [shared-platform](../../../README.md) — released independently to GitHub Packages.
- **Agent entrypoint:** [AGENTS.md](./AGENTS.md).
