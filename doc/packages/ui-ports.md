---
title: '@fmmenchi/ui-ports'
---

# @fmmenchi/ui-ports

The **injection contracts** that keep `@fmmenchi/ui` provider-agnostic: TypeScript interfaces
only, zero runtime. Your app implements the adapters (i18n locale, router link, icon renderer,
portal target) and passes them once through `UiProvider` — the design system bundles no i18n
engine, no router, no icon set.

## Install

```bash
pnpm add @fmmenchi/ui-ports
```

## Usage

```ts
import type { UiAdapters } from '@fmmenchi/ui-ports';

export const adapters: UiAdapters = {
  i18n: { locale: 'it' }, // the only mandatory port
  Link: NextLink, // optional: bridge your router
  navigate: (href) => router.push(href),
};
```

Text direction is **derived** from the locale (`ar` → rtl) — never injected. An app can write its
adapters against this package without importing the component library.

## Reference

- Port design and i18n ownership: [ADR 0001 — UI library foundations](../adr/0001-ui-library-foundations.md)
- Source: `packages/client/ui-ports`
