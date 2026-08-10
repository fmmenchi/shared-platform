---
title: '@fmmenchi/ui-router-ports'
sidebar_label: ui-router-ports
sidebar_position: 0
---

# @fmmenchi/ui-router-ports

Implementations of `@fmmenchi/ui`'s **routing ports** — one subpath per router, so an app installs
only what it uses.

`@fmmenchi/ui` renders `Nav`, `NavLink`, `Menu` and `CardTitle` without knowing how your app
navigates: it declares two ports — a link component and "is this where the reader already is?" — and
asks the app to fill them. This package is that filling for the two typed React routers.

```tsx
import { reactRouterAdapters } from '@fmmenchi/ui-router-ports/react-router';

<UiProvider adapters={{ i18n, ...reactRouterAdapters }}>
  <App />
</UiProvider>;
```

From then on a menu is just a menu — `NavLink` navigates through your router and marks where the
reader is, with nothing further to wire.

## Prerequisites

- **`@fmmenchi/ui`** and **React 19** — both peer dependencies.
- **One router**: `react-router` or `@tanstack/react-router`, each declared an **optional** peer.

```bash
pnpm add @fmmenchi/ui-router-ports react-router
```

Remix is React Router and uses `./react-router` unchanged. Next needs no adapter at all — see
[Concepts](./concepts/index.md#-next-is-not-here-and-why).

## 🚀 Guides

- [Wire a router](./guides/wire-a-router.md) — bind the bundle once, render a navigation.
- [Mark where the reader is](./guides/mark-where-the-reader-is.md) — `aria-current`, section vs
  page, and the trap of marking two.

## 📚 Reference

- [Subpaths](./reference/subpaths.md) — both, with what each exports and what its router does on its
  own.

## 🏗 Concepts

- [Concepts](./concepts/index.md) — why `href` is not `to`, why "active" is not one idea, and why
  the bundles are bundles.
