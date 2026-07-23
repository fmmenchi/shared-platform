---
title: Scaffold a theme
sidebar_label: Scaffold a theme
sidebar_position: 1
---

# Scaffold a theme

## Intent

Generate a complete brand theme — every color role assigned — into an existing project, and wire
its CI gate in the same step. Starting from the scaffold guarantees the theme is complete and
in sync with your installed `@fmmenchi/tokens` contract; you only edit values from there.

## Step 1: Run the `theme` generator

Point it at the project that should own the theme.

```bash
pnpm nx g @fmmenchi/nx-theme-generator:theme acme --project=web
```

This writes `apps/web/src/themes/acme.css` — a complete `[data-theme='acme']` block whose starting
values are the light reference preset, with a header recording the exact tokens version it was
instantiated from. It then calls the `validation` generator, adding (or updating) the
`validate-themes` target on the `web` project and registering the new file.

:::tip[Complete by construction]

The scaffold is built from the `--fm-color-*` roles found in your installed
`@fmmenchi/tokens/styles/vars.css`, so it always contains every role the contract defines. The one
editing rule: change the values, never remove a role.

:::

## Step 2: Edit the values

Open the generated file and set your brand's colors. Keep every value a resolved sRGB literal — a
`var()` reference or an out-of-gamut color will fail validation.

```css
[data-theme='acme'] {
  --fm-color-primary: oklch(0.55 0.2 265);
  --fm-color-primary-foreground: oklch(0.99 0 0);
  /* …every other role… */
}
```

## Step 3: Validate

Run the target the generator wired for you.

```bash
pnpm nx run web:validate-themes
```

A passing file prints `✓ apps/web/src/themes/acme.css — allowed theme`. A failing one reports the
exact problem — fix the value, don't lower the bar:

```
✗ apps/web/src/themes/acme.css is NOT an allowed theme:
  primary × primary-foreground: 3.91 < 4.5
  missing color role "ring"
```

:::tip[Fixing a failed contrast pair]

Move the value's _lightness_ (keep the hue, scale the chroma) until the reported ratio passes — that
restores contrast while preserving the color's identity.

:::

## Step 4: Apply the theme

Import the CSS file with your styles and set the attribute on the document root.

```html
<html data-theme="acme"></html>
```

## Options

Scaffold into a different directory, or skip the wiring:

```bash
# Custom directory (relative to the project root; default is src/themes)
pnpm nx g @fmmenchi/nx-theme-generator:theme acme --project=web --directory=styles/themes

# Scaffold only, don't wire the validate-themes target
pnpm nx g @fmmenchi/nx-theme-generator:theme acme --project=web --skipValidation
```

If `@fmmenchi/tokens` is installed in a sub-package rather than hoisted to the workspace root and
cannot be resolved, point the generator at its `vars.css` explicitly with
`--tokensPath=<path>/vars.css`.

## Related

- [Gate themes in CI](./gate-themes-in-ci) — run `validate-themes` on every push.
- [Register a hand-written theme](./register-existing-theme) — add a file you authored by hand.
- [Generators & executor reference](../reference/cli) — all arguments, options and defaults.
