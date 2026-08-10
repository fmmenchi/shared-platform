---
title: Subpaths
sidebar_label: Subpaths
sidebar_position: 1
---

# Subpaths

Every entry point in `@fmmenchi/ui-router-ports`. The package has **two subpaths** and no root
export: you import the one router you use, and the other never enters your bundle.

---

## Summary

| Subpath          | Needs                                    | Exports                                                             |
| ---------------- | ---------------------------------------- | ------------------------------------------------------------------- |
| `./react-router` | `react-router` (optional peer)           | `reactRouterAdapters`, `ReactRouterLink`, `useReactRouterIsCurrent` |
| `./tanstack`     | `@tanstack/react-router` (optional peer) | `tanstackAdapters`, `TanstackLink`, `useTanstackIsCurrent`          |

`react` and `@fmmenchi/ui` are required peers. Both routers are declared **optional**, so installing
the package asks nothing of you beyond the one you chose.

---

## The bundles

`reactRouterAdapters` and `tanstackAdapters` are the two members together — the link component and
the "is this current?" hook — because knowing they must come from the SAME router is a fact about
this design system and not one a consumer should have to hold. Mixing them produces a menu that
navigates correctly and highlights nothing.

They are **not** a place to put anything else. A member is added here only when `@fmmenchi/ui`
declares a port for it.

The individual members are exported too, for an app that composes its adapters itself.

---

## What each router does on its own

| Router          | What its link does unaided                                                               |
| --------------- | ---------------------------------------------------------------------------------------- |
| React Router    | `Link` marks nothing; `NavLink` marks `aria-current="page"`, exactly                     |
| TanStack Router | `Link` marks `aria-current="page"` itself, and `activeOptions` defaults to **non-exact** |

That default is not cosmetic: at `/settings/profile` it marks both `Settings` and `Profile`.
`TanstackLink` narrows what "active" means, which is the only available lever — the attribute is
spread last inside the link, after `activeProps` and after the caller's own props, so nothing passed
in can override it.

---

## `./react-router`

`ReactRouterLink` renders the library's `NavLink` and translates `href` → `to`.
`useReactRouterIsCurrent` is exported for completeness; the bundle relies on `NavLink`'s own
marking, which is already exact.

Remix is React Router: use this subpath unchanged.

## `./tanstack`

`TanstackLink` renders the library's `Link`, translates `href` → `to`, and narrows `activeOptions` so
that one entry is current rather than every ancestor of it.

---

## The cost, stated

The richer forms of `to` do not pass through `NavLink`: no object form
(`{ pathname, search, hash }`), no typed `params`/`search`, and under TanStack the compile-time route
check is spent. For the one item that needs them, use the router's own `Link` directly and keep
`NavLink` for the menu.

---

## Validation

Both subpaths are exercised by **one** suite in `apps/ui-ports-validation` (`routers.test.tsx`),
running the same assertions against both — if either needed its own, the port would be leaking.
