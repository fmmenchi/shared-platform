# Architecture

`shared-platform` is the private monorepo of shared layers — UI, AI, data access, security,
prompts, analytics, MCP. It contains **only libraries**: no apps, no running services. Each
package is an abstract, independent layer; applications and services live in their own
repositories and consume these packages from GitHub Packages as `@fmmenchi/<name>` (see
[consuming-packages](./consuming-packages.md)).

## Why this shape

- **One source of truth for cross-service code.** Contracts, clients, and utilities are written
  once and versioned, instead of copy-pasted between app repos.
- **Independent releases.** Each package has its own version, changelog, and release cadence
  (`nx release`, independent mode), so bumping the AI layer never forces a UI release.
- **Fast, incremental type-safety.** The workspace uses pnpm workspaces + TypeScript project
  references (Nx TS-solution setup): each package typechecks against the compiled declarations of
  its dependencies, and Nx keeps the reference graph in sync automatically (`nx sync`).

## Structure

```
packages/
  shared/            # isomorphic — runs anywhere, no DOM or Node APIs
    core/            # base utilities
    api-contracts/   # generic contract envelopes shared between FE and BE
  client/            # browser-only layers for the frontends
    api-client/      # typed HTTP client over the contracts
    …                # design system (tokens + ui), analytics client, …
  server/            # Node-only layers for the backends
    config/          # configuration/env loading
    …                # data access, security, MCP, …
  plugins/           # Nx plugins (generators/executors), consumed as devDeps by other repos
  tools/             # scripts (dev/ops-time utilities)
```

The first level is the **scope** — where the code may run — and it is also the dependency rule:
`client` and `server` may depend on `shared`, never on each other; `shared` depends only on
itself; `plugins` and `tools` are dev-time layers nothing else depends on. The rule is enforced
twice: structurally (a package can only import what its `package.json` declares) and by lint
(`@nx/enforce-module-boundaries` over `scope:*`/`type:*` tags in each package's `nx.tags`).

The placement principle behind all of this: **a scope records who actually depends on a
package, not what it conceptually "is"**. `shared` is not "the conceptually shared things" — it
is the (costly) position a package is promoted to only when a `client` package _and_ a `server`
package really import it. Every layer is born in the narrowest scope that contains it and moves
up on the first real cross-side dependency, never preemptively — promotion later is a cheap
`nx g move`. Two applications of the principle: UI components live in `client` even though SSR
executes them in Node (they target the DOM and must stay SSR-safe), and the design system —
token skeleton, components, reference preset — lives entirely in `client` today, because no
server layer consumes token types; brand presets belong to the consuming apps either way.

Within a scope, packages are classified by **type** — `util`, `data-access`, `ui`, `feature` —
with the usual Nx hierarchy: `feature → ui/data-access → util`.

## Toolchain

| Concern  | Choice                                                 |
| -------- | ------------------------------------------------------ |
| Monorepo | Nx 23, pnpm 11 workspaces, TS project references       |
| Language | TypeScript 6 (strict, ES2022, NodeNext resolution)     |
| Lint     | ESLint 9 flat config + module boundaries; Prettier     |
| Commits  | Conventional Commits, enforced by commitlint + husky   |
| Releases | `nx release` — independent versioning, GitHub Packages |

## Adding a new layer

New packages are generated (never hand-scaffolded) with the official Nx generator:

```bash
pnpm nx g @nx/js:library packages/<scope>/<name> --linter=eslint --tags=scope:<scope>,type:<type>
```

then made publishable by copying the publish fields (`publishConfig`, `repository`, `files`) from
an existing package.
