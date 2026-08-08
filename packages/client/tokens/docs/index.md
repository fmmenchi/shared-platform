---
title: '@fmmenchi/tokens'
---

# @fmmenchi/tokens

The **semantic token contract** — the single vocabulary every theme must satisfy: 78 color roles
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

### Styles written in TypeScript

If your styles are TypeScript rather than CSS — styled-components, emotion, vanilla-extract, an
inline `style` — import the same names as strings:

```ts
import { vars } from '@fmmenchi/tokens';

vars.color.primary; // 'var(--fm-color-primary)'
vars.space['inset-m']; // 'var(--fm-space-inset-m)'
```

```ts
const Panel = styled.section`
  background: ${vars.color.card};
  color: ${vars.color['card-foreground']};
  padding: ${vars.space['inset-m']};
  border-radius: ${vars.radius.lg};
`;
```

The same string works anywhere a CSS value goes:

```ts
export const panel = style({ background: vars.color.card }); // vanilla-extract
<div style={{ background: vars.color.card }} />; // React
```

There is no adapter per library, and deliberately so: a custom property is already the universal
surface, so `vars` adds no capability — what it adds is that `vars.color.primry` does not compile,
where the hand-written `var(--fm-color-primry)` renders as nothing and waits to be noticed.

Keys are the **token names**, kebab included, so one search finds the CSS, the contract and your
call site.

**They are references, not values.** `vars.color.primary` is the string `var(--fm-color-primary)`,
which re-points when the theme changes — a value copied at build time would not. Where you need the
resolved value (a canvas, a charting library), read it at the moment you need it:

```ts
getComputedStyle(element).getPropertyValue('--fm-color-primary');
```

### Validating a theme

A theme is a **complete** assignment of every color role. Gate yours in CI:

```ts
import { validateTheme } from '@fmmenchi/tokens/validate';
expect(validateTheme(brandColors)).toEqual([]);
```

Checks: completeness · parsable colors · sRGB gamut · WCAG contrast on every declared pair
(exact ratios on failure). Prefer scaffolding themes with
[`@fmmenchi/nx-theme-generator`](../../plugins/nx-theme-generator/index.md).

## Reference

- Deep dive: [Styling the design system](../../styling.md)
- Consumer recipes: [Consuming packages](../../consuming-packages.md)
- Source: `packages/client/tokens`
