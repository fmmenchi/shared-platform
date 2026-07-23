---
title: Gate themes in CI
sidebar_label: Gate themes in CI
sidebar_position: 2
---

# Gate themes in CI

## Intent

Make theme validation a build gate: every push re-checks every registered theme against the
installed `@fmmenchi/tokens` contract, so a broken color pairing — or a missing role after a tokens
upgrade — fails CI instead of shipping.

## Step 1: Confirm the target exists

The `theme` generator wires the `validate-themes` target automatically (unless `--skipValidation`).
The target on the project looks like this:

```jsonc
// project.json / package.json "nx.targets"
"validate-themes": {
  "executor": "@fmmenchi/nx-theme-generator:validate",
  "options": {
    "themes": ["apps/web/src/themes/acme.css"]
  }
}
```

If it is missing, wire it with the `validation` generator:

```bash
pnpm nx g @fmmenchi/nx-theme-generator:validation web --themes=apps/web/src/themes/acme.css
```

## Step 2: Run it locally

```bash
pnpm nx run web:validate-themes
```

Or validate every project that has the target across the workspace:

```bash
pnpm nx run-many -t validate-themes
```

## Step 3: Add it to the CI gate

Include `validate-themes` in the task list your pipeline runs on each push — alongside
`typecheck`, `build`, `lint` and `test`. Because the target is a normal Nx target, `nx affected`
picks it up when a theme file (or the tokens dependency) changes:

```bash
pnpm nx affected -t validate-themes
```

:::tip[Why it catches tokens upgrades]

The executor resolves `@fmmenchi/tokens` at run time, so `validate-themes` always checks against the
version currently installed. If a tokens upgrade adds a color role, the gate fails on the next run
until every theme assigns it — turning a silent contract change into an actionable build failure.

:::

## Reading the result

The executor exits non-zero if any file has a violation. Per-file output:

```
✓ apps/web/src/themes/acme.css — allowed theme
✗ apps/web/src/themes/dusk.css is NOT an allowed theme:
  background × foreground: 4.02 < 4.5
```

## Related

- [Scaffold a theme](./scaffold-a-theme) — generate a complete theme and its gate in one command.
- [`validate` executor reference](../reference/cli#validate) — options and behavior.
