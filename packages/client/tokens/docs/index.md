---
title: '@fmmenchi/tokens'
---

# @fmmenchi/tokens

The **semantic token contract** — the single vocabulary every theme must satisfy: 84 color roles
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
import { tokenVars } from '@fmmenchi/tokens';

vars.color.primary; // 'var(--fm-color-primary)'
vars.space['inset-m']; // 'var(--fm-space-inset-m)'
```

```ts
const Panel = styled.section`
  background: ${tokenVars.color.card};
  color: ${tokenVars.color['card-foreground']};
  padding: ${tokenVars.space['inset-m']};
  border-radius: ${tokenVars.radius.lg};
`;
```

The same string works anywhere a CSS value goes:

```ts
export const panel = style({ background: tokenVars.color.card }); // vanilla-extract
<div style={{ background: tokenVars.color.card }} />; // React
```

There is no adapter per library, and deliberately so: a custom property is already the universal
surface, so it adds no capability — what it adds is that `tokenVars.color.primry` does not compile,
where the hand-written `var(--fm-color-primry)` renders as nothing and waits to be noticed.

Keys are the **token names**, kebab included, so one search finds the CSS, the contract and your
call site.

Three things it does **not** do, worth knowing before you meet them:

- **Not React Native.** It has no custom properties, so the string is not a colour it can use.
- **Not inside a query condition.** `var()` is invalid in a media or container feature value, so
  `@media (min-width: ${tokenVars.size.container})` compiles, is dropped whole by the browser, and
  never matches at any width. Use the exported `BREAKPOINTS` / `CONTAINER_BREAKPOINTS` literals.
- **Not a value.** `tokenVars.color.primary` is the string `var(--fm-color-primary)`, which
  re-points when the theme changes — a value copied at build time would not.

Where you need the resolved value (a canvas, a charting library), read it at the moment you need it:

```ts
getComputedStyle(element).getPropertyValue('--fm-color-primary').trim();
```

Two traps there. Colour roles are `@property`-registered, so this **never returns an empty
string**: before the token stylesheet applies, it returns the registered placeholder — opaque
black — with nothing falsy to test. And registered roles come back normalised while unregistered
tokens come back as the raw text, which Chrome and Safari prefix with a space; hence the `.trim()`.

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
