# Architecture — agent rules

**Abstract layers only** for the published surface. No product apps, no services, no project
implementations under `packages/` — ship the contract/skeleton/mechanism; concretions (brand
values, tenant/env config, app wiring) belong to the consuming repos. The lone non-published
exception is the internal docs site under `apps/` (see the `apps/` row). Human rationale:
`../../apps/docusaurus/docs/architecture.md`.

## Layout: `packages/<scope>/<name>` (+ `apps/<name>`)

| Scope      | Runs in                         | May depend on       | Examples                                               |
| ---------- | ------------------------------- | ------------------- | ------------------------------------------------------ |
| `shared/`  | anywhere (no DOM, no Node APIs) | `shared` only       | core, api-contracts                                    |
| `client/`  | browser                         | `client`, `shared`  | design system (tokens + ui), analytics client          |
| `server/`  | Node                            | `server`, `shared`  | data access, security, MCP                             |
| `plugins/` | Nx, dev-time                    | `plugins`, `shared` | Nx plugins (generators, executors)                     |
| `tools/`   | Node, dev/ops-time              | `tools`, `shared`   | scripts                                                |
| `apps/`    | the docs site (dev-time)        | any layer           | Docusaurus site (`@fmmenchi/docs`) — **not published** |

No runtime scope depends on `plugins`/`tools`; nothing depends on `apps/`. `apps/` is **excluded
from `nx release`** (`nx.json` `release.projects` is `packages/*/*`).

Settled placement calls — don't relitigate:

- **Scope = who actually depends on it, not what it conceptually "is".** A package is born in
  the narrowest scope that contains it and is promoted to `shared` only on the first real
  dependency from the other side — never preemptively (`@nx/workspace:move` makes promotion
  cheap).
- Design system (token skeleton, components, reference preset) → `client`. Brand presets → the
  consuming apps, never here.
- UI components → `client`, even under SSR. Keep them SSR-safe (no `window`/`document` at module
  top-level; lint can't catch this).

## Tags and boundaries

Each package: `nx.tags` = one `scope:*` + one `type:*` (`util`, `data-access`, `ui`, `feature`;
hierarchy `feature → ui/data-access → util`). Enforced by `@nx/enforce-module-boundaries` (root
`eslint.config.mjs`) and by explicit deps in the package's `package.json`
(`"@fmmenchi/x": "workspace:*"`).

## Creating a library

```bash
pnpm nx g @nx/js:library packages/server/auth --linter=eslint --tags=scope:server,type:data-access
```

- Package name = `@fmmenchi/<directory basename>` — keep basenames unique across scopes.
- Generator by kind: plain TS → `@nx/js:library`; React UI → `@nx/react:library`; Nx plugin →
  `@nx/plugin:plugin` (+ `@nx/plugin:generator`).
- After generating, add the publish fields (`publishConfig` → `https://npm.pkg.github.com`,
  `repository` with `directory`, `files: ["dist"]`, no `private`) — the generator doesn't.
- Move/rename: `pnpm nx g @nx/workspace:move --projectName <name> --destination
packages/<scope>/<name>`, then delete stale `dist/`/`node_modules/` at the old path.

## TypeScript project references

Reference arrays are managed by `nx sync` — never edit them by hand. Runtime-specific compiler
options go in the package's `tsconfig.lib.json` (`"types": ["node"]` for `server/*`, DOM libs
for `client/*`).

## pnpm

- Workspace globs (`pnpm-workspace.yaml`): `packages/*` + `packages/*/*` + `apps/*` — a new
  grouping level requires updating them.
- `allowBuilds` in `pnpm-workspace.yaml` must keep `nx: true` and `@swc/core: true`.
