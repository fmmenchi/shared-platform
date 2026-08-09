# @fmmenchi/ui-router-ports

Implementations of `@fmmenchi/ui`'s routing ports — **one subpath per router**,
so an app installs only what it uses.

```tsx
import { reactRouterAdapters } from '@fmmenchi/ui-router-ports/react-router';

<UiProvider adapters={{ i18n, ...reactRouterAdapters }}>
```

From then on a menu is just a menu — `Nav` and `NavLink` navigate through your
router and mark where the reader is, with nothing further to wire.

## Why this exists, when the adapter is "one line"

Because it is not one line, and the second line is the one nobody writes.

The first line is a rename: the port is `href`, the HTML attribute and the one
name no router invented, and both routers here navigate on `to`. Handed the
port's props unchanged, each renders an anchor with **no destination** — a link
that is announced as a link and goes nowhere.

Calling that a rename is convenient and not quite true: `href` and `to` are
different kinds of thing. `href` is the HTML attribute — a URL string the
browser resolves on its own, which is why `NavLink` without a provider is still
a working link. `to` is a route DESCRIPTOR: React Router also accepts an object
(`{ pathname, search, hash }`), TanStack types it against your route tree and
pairs it with `params`/`search`, and neither is a URL until the router resolves
it.

What the binding does is hand the router the one form they all accept — a path
string — and let it compute the real thing:

    href="/settings"   →   to="/settings"   →   <a href="/settings">

The anchor always ends up with a genuine `href`, which is what keeps
middle-click, "open in a new tab" and the status bar working.

What that costs, precisely: the richer forms of `to` do not pass through
`NavLink`. No object form, no typed `params`/`search`, and under TanStack the
compile-time route check is spent. For the one item that needs them, use the
router's own `Link` directly and keep `NavLink` for the menu.

The second thing is that every router has its own idea of what "active" means,
and they do not agree:

| Router          | What its link does on its own                                                            |
| --------------- | ---------------------------------------------------------------------------------------- |
| React Router    | `Link` marks nothing; `NavLink` marks `aria-current="page"`, exactly                     |
| TanStack Router | `Link` marks `aria-current="page"` itself, and `activeOptions` defaults to **non-exact** |

That default is not cosmetic. Measured at `/settings/profile`, a TanStack menu
gave `aria-current="page"` to **both** `Settings` and `Profile` — a screen
reader announcing "current page" twice, with nothing to tell the two apart. The
attribute is spread last inside the link, after `activeProps` and after the
caller's own props, so nothing passed in can override it; the only lever is
narrowing what "active" means, which is what `TanstackLink` does.

So the binding is where a router's characteristics are absorbed, and the point
of the package is that a consumer never learns them.

## Why one package and not one per router

Because the cost of an integration you do not use is **zero**: you never import
its subpath, so it never enters your bundle, and its peer dependency is declared
**optional**, so nothing asks you to install it. Separate packages would cost N
releases, N changelogs and N versions to keep in step with `@fmmenchi/ui`.

Same shape, and the same reasoning, as [`@fmmenchi/ui-form-ports`](../ui-form-ports/README.md).

## Subpaths

| Subpath          | Needs                                    | Provides                                                            |
| ---------------- | ---------------------------------------- | ------------------------------------------------------------------- |
| `./react-router` | `react-router` (optional peer)           | `reactRouterAdapters`, `ReactRouterLink`, `useReactRouterIsCurrent` |
| `./tanstack`     | `@tanstack/react-router` (optional peer) | `tanstackAdapters`, `TanstackLink`, `useTanstackIsCurrent`          |

Both are exercised by **one** suite in `apps/ui-ports-validation`
(`routers.test.tsx`), running the same assertions against both — if either
needed its own, the port would be leaking. That suite is what found the TanStack
default above.

Remix is React Router and uses `./react-router` unchanged.

## Next is not here, and why

`next/link` and `usePathname` cannot be exercised outside a Next runtime, so a
Next binding would be the one thing in this package the shared suite could not
check — and the shared suite is the package's whole claim to being correct. Next
needs no link adapter anyway: `next/link` already takes `href`. The matching
recipe stays documented with `Nav`:

```tsx
<UiProvider
  adapters={{
    i18n,
    Link, // next/link, as-is
    useIsCurrent: (href) => pathIsCurrent(usePathname(), href),
  }}
/>
```

## What the bundles are, and what they are not

`reactRouterAdapters` and `tanstackAdapters` are the two members together,
because knowing they must come from the SAME router is a fact about this design
system and not one a consumer should have to hold. Mixing them is the wiring
mistake that produces a menu which navigates correctly and highlights nothing.

They are **not** a place to put anything else. A member is added here only when
`@fmmenchi/ui` declares a port for it.
