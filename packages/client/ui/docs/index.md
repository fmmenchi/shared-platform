---
title: '@fmmenchi/ui'
---

# @fmmenchi/ui

Native-first, accessible, provider-agnostic React components. Authored with CSS Modules +
Tailwind + `cva`, published as **precompiled CSS** — you import a stylesheet, you never run
Tailwind. Polymorphic via the typed `as` prop; localized micro-copy built in (en/it/ar, RTL-aware);
auto-memoized by the React Compiler.

## Install

```bash
pnpm add @fmmenchi/ui @fmmenchi/tokens
```

## Usage

```css
/* app.css */
@import '@fmmenchi/tokens/styles/vars.css';
@import '@fmmenchi/ui/style.css'; /* all components */
```

```tsx
import { UiProvider, Button } from '@fmmenchi/ui';

<UiProvider adapters={{ i18n: { locale: 'en' } }}>
  <Button variant="primary">Save</Button>
  <Button as="a" href="/next">
    Link that looks like a button
  </Button>
</UiProvider>;
```

### Import only what you use

The package tree-shakes; for guaranteed granularity use the per-component subpaths:

```tsx
import { Button } from '@fmmenchi/ui/button';
```

```css
@import '@fmmenchi/ui/button/style.css'; /* just the Button's styles */
```

## Reference

- How and why it is styled this way: [Styling the design system](../../styling.md)
- Consumer recipes (theming, granular imports): [Consuming packages](../../consuming-packages.md)
- Source: `packages/client/ui` (Storybook: `pnpm nx storybook @fmmenchi/ui`)
