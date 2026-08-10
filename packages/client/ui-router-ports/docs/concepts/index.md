---
title: Concepts
sidebar_label: 🏗 Concepts
sidebar_position: 3
---

# Core Concepts

Why a "one-line" adapter is not one line, and what the binding absorbs so a consumer never learns a
router's characteristics.

---

## 💡 The Philosophy

### 1. `href` is the port, and it is not a rename of `to`

The first line of any router binding looks like a rename: the port is `href` — the HTML attribute,
and the one name no router invented — and both routers here navigate on `to`. Handed the port's props
unchanged, each renders an anchor with **no destination**: a link that is announced as a link and
goes nowhere.

Calling it a rename is convenient and not quite true. `href` and `to` are different kinds of thing:

- **`href`** is a URL string the browser resolves on its own. That is why `NavLink` with no provider
  is still a working link.
- **`to`** is a route DESCRIPTOR. React Router also accepts an object (`{ pathname, search, hash }`);
  TanStack types it against your route tree and pairs it with `params`/`search`. Neither is a URL
  until the router resolves it.

What the binding does is hand the router the one form they all accept — a path string — and let it
compute the real thing:

```
href="/settings"   →   to="/settings"   →   <a href="/settings">
```

The anchor always ends up with a genuine `href`, which is what keeps middle-click, "open in a new
tab" and the status bar working.

**What that costs, precisely:** the richer forms of `to` do not pass through. For the one item that
needs them, use the router's own `Link` and keep `NavLink` for the menu.

### 2. "Active" is not one idea

The second line is the one nobody writes: every router has its own notion of what active means, and
they do not agree.

| Router          | What its link does unaided                                                               |
| --------------- | ---------------------------------------------------------------------------------------- |
| React Router    | `Link` marks nothing; `NavLink` marks `aria-current="page"`, exactly                     |
| TanStack Router | `Link` marks `aria-current="page"` itself, and `activeOptions` defaults to **non-exact** |

Measured at `/settings/profile`, a TanStack menu gave `aria-current="page"` to **both** `Settings`
and `Profile` — a screen reader announcing "current page" twice, with nothing to tell the two apart.
The attribute is spread last inside the link, after `activeProps` and after the caller's own props, so
nothing passed in can override it; the only lever is narrowing what "active" means.

So the binding is where a router's characteristics are absorbed, and the point of the package is that
a consumer never learns them.

### 3. The design system only asks

```ts
type UseIsCurrent = (
  href: string,
) => boolean | 'page' | 'step' | 'location' | 'date' | 'time' | undefined;
```

A **hook**, for the same reason the form binding's members are hooks: it is called inside each link,
so each subscribes for itself and re-renders when the route changes. Matching a path is the router's
job — a basename, a locale prefix, typed params, search — and the design system never learns how it
is done.

`'page'` and `'location'` are different claims: the page the reader is on, and a section that
contains it. Leave the hook out entirely when the injected `Link` already marks itself — whoever
renders the anchor wins, so a second opinion could only disagree.

---

## 📦 One package, two subpaths

The cost of an integration you do not use is **zero**: you never import its subpath, so it never
enters your bundle, and its peer dependency is declared **optional**, so nothing asks you to install
it. Separate packages would cost N releases, N changelogs and N versions to keep in step with
`@fmmenchi/ui`.

Same shape, and the same reasoning, as `@fmmenchi/ui-form-ports`.

---

## 🧪 One suite, both routers

Both subpaths are exercised by **one** suite in `apps/ui-ports-validation` (`routers.test.tsx`),
running the same assertions against both — if either needed its own, the port would be leaking. That
suite is what found the TanStack default above.

---

## 🚫 Next is not here, and why

`next/link` and `usePathname` cannot be exercised outside a Next runtime, so a Next binding would be
the one thing in this package the shared suite could not check — and the shared suite is the
package's whole claim to being correct.

Next needs no link adapter anyway: `next/link` already takes `href`. The matching recipe stays
documented with `Nav`:

```tsx
<UiProvider
  adapters={{
    i18n,
    Link, // next/link, as-is
    useIsCurrent: (href) => pathIsCurrent(usePathname(), href),
  }}
/>
```

---

## ➕ Adding a router

A new subpath, an optional peer, an entry in the build, a row in the reference table, and a row in
the shared suite. A member is added to a bundle only when `@fmmenchi/ui` declares a port for it.
