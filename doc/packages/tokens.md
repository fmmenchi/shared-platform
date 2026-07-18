---
title: '@fmmenchi/tokens'
---

# @fmmenchi/tokens

The **semantic token contract** — the single vocabulary every theme must satisfy: 67 color roles
(action families, status, surfaces, inputs, focus ring), semantic spacing, type scales, radius,
borders, shadows, motion-by-intent and z-layers. Components consume **only** these roles;
"semantics wins over everything".

## Install

```bash
pnpm add @fmmenchi/tokens
```

## Usage

The tokens ship in two shapes of the SAME values:

```css
/* Plain CSS (no Tailwind required) */
@import '@fmmenchi/tokens/styles/vars.css';
@import '@fmmenchi/tokens/styles/presets/dark.css'; /* optional */
```

```css
/* Tailwind consumer: the @theme source + name bridge */
@import '@fmmenchi/tokens/styles/tailwind.css';
```

Switch theme at runtime with `<html data-theme="dark">` — presets re-point the `--fm-*` variables,
no rebuild.

### Validating a theme

A theme is a **complete** assignment of every color role. Gate yours in CI:

```ts
import { validateTheme } from '@fmmenchi/tokens/validate';
expect(validateTheme(brandColors)).toEqual([]);
```

Checks: completeness · parsable colors · sRGB gamut · WCAG contrast on every declared pair
(exact ratios on failure). Prefer scaffolding themes with
[`@fmmenchi/theme-generator`](./theme-generator.md).

## Reference

- Deep dive: [Styling the design system](../styling.md)
- Consumer recipes: [Consuming packages](../consuming-packages.md)
- Source: `packages/client/tokens`
