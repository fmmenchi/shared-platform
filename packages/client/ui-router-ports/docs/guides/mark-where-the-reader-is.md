---
title: Mark where the reader is
sidebar_label: Mark where the reader is
sidebar_position: 2
---

# Mark where the reader is

Get `aria-current` onto exactly one entry, and onto the right one.

## Intent

A navigation that highlights the current page with colour alone tells a screen-reader user nothing.
`aria-current` is what carries it, and the two routers disagree about when to set it — which is most
of what this package absorbs.

## The port

```ts
type UseIsCurrent = (
  href: string,
) => boolean | 'page' | 'step' | 'location' | 'date' | 'time' | undefined;
```

Two answers matter for a navigation, and they are not the same claim:

- **`'page'`** — the page the reader is on. `true` means this.
- **`'location'`** — a SECTION that contains it: the parent entry of a sidebar.

Return nothing for "not here". The design system never learns how the answer is computed — matching a
path is the router's job, and every router does it differently (a basename, a locale prefix, typed
params, search). It only asks.

## Two current pages is the failure to look for

Measured at `/settings/profile`, a TanStack menu gave `aria-current="page"` to **both** `Settings`
and `Profile` — a screen reader announcing "current page" twice, with nothing to tell the two apart.
TanStack's `Link` marks itself, and its `activeOptions` defaults to **non-exact**.

The attribute is spread last inside the link, after `activeProps` and after the caller's own props,
so nothing passed in can override it. The only lever is narrowing what "active" means, which is what
`TanstackLink` does. Binding `./tanstack` gets you that narrowing; hand-wiring TanStack's `Link`
yourself does not.

## Leave `useIsCurrent` out when the link marks itself

Whoever renders the anchor wins, so a second opinion can only disagree. React Router's `NavLink` sets
`aria-current="page"` on its own, and TanStack's `Link` resolves activity from typed params the
design system cannot see — which is why both bundles ship the pair that agrees, rather than a
`Link` and a matcher chosen separately.

## Without a router

`useIsCurrent` is an ordinary function, so an app with no router at all can answer it. The recipe
that stays documented with `Nav` — and the one Next uses, since `next/link` already takes `href`:

```tsx
<UiProvider
  adapters={{
    i18n,
    Link, // next/link, as-is
    useIsCurrent: (href) => pathIsCurrent(usePathname(), href),
  }}
/>
```

## Verify

At a nested route, count the entries carrying `aria-current`. Exactly one should say `page`; a parent
section, if you mark one, says `location`. The shared suite in `apps/ui-ports-validation`
(`routers.test.tsx`) makes that assertion against both routers — it is what found the TanStack
default above.

## Next steps

- [Subpaths](../reference/subpaths.md) — what each bundle contains.
- [Concepts](../concepts/index.md) — why the binding is where a router's characteristics are absorbed.
