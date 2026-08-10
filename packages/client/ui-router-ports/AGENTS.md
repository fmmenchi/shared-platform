# AGENTS.md — @fmmenchi/ui-router-ports

The two typed React routers bound to `@fmmenchi/ui`'s routing ports. Part of `shared-platform`;
workspace contract in [../../../AGENTS.md](../../../AGENTS.md). Scope `client`, type `ui`. Human
documentation lives in [docs/](./docs/index.md) — keep it current with these rules, never duplicate
them into it.

## Commands

```bash
pnpm nx typecheck @fmmenchi/ui-router-ports
pnpm nx build @fmmenchi/ui-router-ports
pnpm nx lint @fmmenchi/ui-router-ports
pnpm nx test @fmmenchi/ui-ports-validation   # THE suite — same assertions, both routers
```

## Rules

- **The port is `href`, and translating it is not a rename.** `href` is the HTML attribute: a URL
  string the browser resolves on its own, which is why `NavLink` with no provider is still a working
  link. `to` is a route DESCRIPTOR — React Router also accepts an object, TanStack types it against
  the route tree and pairs it with `params`/`search`, and neither is a URL until the router resolves
  it. The binding hands over the one form both accept, a path string, and lets the router compute the
  rest. **The anchor must always end up with a real `href`** — that is what keeps middle-click, "open
  in a new tab" and the status bar working.
  - The cost is stated rather than hidden: the richer forms of `to` do not pass through. Consumers
    who need them use the router's own `Link` for that one item.
- **The binding absorbs the router's idea of "active", and that is most of its value.** Measured at
  `/settings/profile`, a TanStack menu marked `aria-current="page"` on BOTH `Settings` and `Profile`
  — a screen reader saying "current page" twice — because its `activeOptions` defaults to non-exact.
  The attribute is spread last inside the link, after `activeProps` and after the caller's props, so
  nothing passed in can override it; narrowing what active MEANS is the only lever, and
  `TanstackLink` is where that is done.
- **Whoever renders the anchor wins.** Leave `useIsCurrent` out when the injected `Link` already
  marks itself — a second opinion can only disagree. That is why the bundles ship a matched PAIR.
- **`reactRouterAdapters` and `tanstackAdapters` are bundles because the two members must come from
  the same router**, and that is a fact about this design system rather than one a consumer should
  hold. Mixing them yields a menu that navigates correctly and highlights nothing. **They are not a
  place to put anything else:** a member is added only when `@fmmenchi/ui` declares a port for it.
- **One suite covers both**, in `apps/ui-ports-validation` (`routers.test.tsx`): the same assertions
  against both routers — **if either needs its own, the port is leaking.** That suite is what found
  the TanStack default above. A new subpath is not done until it is a row in it.
- **Next stays out, and the reason is the suite.** `next/link` and `usePathname` cannot be exercised
  outside a Next runtime, so a Next binding would be the one thing here the shared suite could not
  check — and that suite is the package's whole claim to being correct. Next needs no adapter anyway:
  `next/link` already takes `href`. The recipe stays documented with `Nav`.
- **Remix is React Router.** It uses `./react-router` unchanged; do not add a subpath for it.
- **Adding a router:** a subpath, an OPTIONAL peer + `peerDependenciesMeta`, an entry in the build, a
  row in the reference table in `docs/reference/subpaths.md`, and a row in the shared suite.

`CLAUDE.md` is a symlink to this file — edit `AGENTS.md` only.
