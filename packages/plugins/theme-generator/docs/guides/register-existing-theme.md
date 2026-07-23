---
title: Register a hand-written theme
sidebar_label: Register a hand-written theme
sidebar_position: 3
---

# Register a hand-written theme

## Intent

You have a theme CSS file you authored (or migrated) by hand, and you want it validated by the same
gate the generator wires. The `validation` generator registers any theme path on a project's
`validate-themes` target, without scaffolding a new file.

## Step 1: Run the `validation` generator

Pass the project and the workspace-relative path(s) of the theme file(s).

```bash
pnpm nx g @fmmenchi/nx-theme-generator:validation web --themes=apps/web/src/themes/legacy.css
```

This adds the `validate-themes` target if the project doesn't have one, or updates it if it does.

## Step 2: Register more than one

The generator is idempotent — re-running merges the new paths into the existing list, dedupes, and
sorts. Register additional files at any time:

```bash
pnpm nx g @fmmenchi/nx-theme-generator:validation web --themes=apps/web/src/themes/dusk.css
```

:::tip[Safe to re-run]

Registering the same path twice is a no-op. There is no way to introduce a duplicate entry, so you
can run the generator freely — for example in a script that discovers theme files.

:::

## Step 3: Validate

```bash
pnpm nx run web:validate-themes
```

A hand-written file is held to the exact same standard as a scaffolded one: completeness, parsable
colors, sRGB gamut, and WCAG contrast on every declared pair. If it was written before a tokens
upgrade added a role, expect a `missing color role` violation until you assign it.

## Related

- [Gate themes in CI](./gate-themes-in-ci) — run the target on every push.
- [`validation` generator reference](../reference/cli#validation) — arguments and options.
