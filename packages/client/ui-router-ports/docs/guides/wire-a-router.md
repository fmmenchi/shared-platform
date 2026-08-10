---
title: Wire a router
sidebar_label: Wire a router
sidebar_position: 1
---

# Wire a router

Bind one of the two subpaths to the design system, once, and render a navigation that actually
navigates.

## Intent

`NavLink` renders an anchor with an `href`. Without a binding that anchor is a plain link: it works,
it is announced correctly, and it reloads the page. Binding a router turns the same markup into
client-side navigation and lets the router say which entry is current.

## Bind the bundle

Spread the bundle into `adapters`. It carries both members together, because knowing they must come
from the SAME router is a fact about this design system, not one a consumer should have to hold.

```tsx
import { UiProvider } from '@fmmenchi/ui';
import { reactRouterAdapters } from '@fmmenchi/ui-router-ports/react-router';

<UiProvider adapters={{ i18n, ...reactRouterAdapters }}>
  <App />
</UiProvider>;
```

TanStack is the same call with the other subpath:

```tsx
import { tanstackAdapters } from '@fmmenchi/ui-router-ports/tanstack';

<UiProvider adapters={{ i18n, ...tanstackAdapters }}>
```

Mixing the two — one router's `Link` with the other's `useIsCurrent` — is the wiring mistake that
produces a menu which navigates correctly and highlights nothing.

## Render a navigation

Nothing below the provider names a router:

```tsx
<Nav label="Sections">
  <NavLink href="/">Overview</NavLink>
  <NavLink href="/settings">Settings</NavLink>
  <NavLink href="/settings/profile">Profile</NavLink>
</Nav>
```

`href` is the port, and deliberately so: it is the HTML attribute and the one name no router
invented. The binding hands the router the form every router accepts — a path string — and the
router computes the real destination:

```
href="/settings"   →   to="/settings"   →   <a href="/settings">
```

The anchor always ends up with a genuine `href`, which is what keeps middle-click, "open in a new
tab" and the browser's status bar working.

## What does not pass through

The richer forms of `to` are not available on `NavLink`: no object form
(`{ pathname, search, hash }`), no typed `params`/`search`, and under TanStack the compile-time route
check is spent.

For the one item that needs them, use the router's own `Link` directly and keep `NavLink` for the
menu. That is a deliberate trade — see [Concepts](../concepts/index.md).

## Verify

Click an entry: the URL changes without a full page load, and exactly one entry carries
`aria-current`. If navigation works and nothing is highlighted, the two members came from different
routers.

## Next steps

- [Mark where the reader is](./mark-where-the-reader-is.md).
