# Architecture — agent rules

## Layout: `packages/<scope>/<name>`

The first level under `packages/` is the **scope** — where the code is allowed to run:

| Scope      | Runs in                                      | May depend on       | Examples                                    |
| ---------- | -------------------------------------------- | ------------------- | ------------------------------------------- |
| `shared/`  | anywhere (isomorphic — no DOM, no Node APIs) | `shared` only       | design-tokens, api-contracts, core, prompts |
| `client/`  | browser only                                 | `client`, `shared`  | ui / design-system, analytics client        |
| `server/`  | Node only                                    | `server`, `shared`  | data access, security, MCP                  |
| `plugins/` | Nx, dev-time                                 | `plugins`, `shared` | Nx plugins (generators, executors)          |
| `tools/`   | Node, dev/ops-time                           | `tools`, `shared`   | scripts                                     |

`client` and `server` never depend on each other, and `shared` never depends on anything else.
`plugins` and `tools` are build/dev-time layers: no runtime scope may depend on them (other
workspaces consume `plugins` as devDependencies). Cross-cutting contracts (DTOs, schemas) belong
in `shared/api-contracts`.

Boundary judgment calls already settled — don't relitigate:

- **UI components are `client`**, even though SSR executes them in Node: they target the DOM and
  their consumers are frontends. They must stay SSR-safe (no `window`/`document` at module
  top-level) — the boundaries cannot enforce this, reviewers must.
- **Design tokens are `shared`, not part of the UI lib**: colors/spacing/typography are pure data
  the server also needs (emails, OG images, PDFs). Burying them in `client/ui` would wall them
  off from the backend.

## Tags and boundaries

Every package declares its tags in `package.json` → `nx.tags`: one `scope:*` and one `type:*`
(`util`, `data-access`, `ui`, `feature`; type hierarchy: `feature → ui/data-access → util`).
The dependency matrix is enforced by `@nx/enforce-module-boundaries` in the root
`eslint.config.mjs` — a forbidden import fails `lint`. There is a second, physical layer of
enforcement: a package can only import what it declares in its own `package.json`
(`"@fmmenchi/x": "workspace:*"`), or typecheck fails.

## Creating a library

Always use the official generator, passing linter and tags:

```bash
pnpm nx g @nx/js:library packages/server/auth --linter=eslint --tags=scope:server,type:data-access
```

- The package name is derived from the directory basename (`@fmmenchi/auth`) — keep basenames
  unique across scopes.
- Pick the generator by kind: plain TS → `@nx/js:library`; React UI (`client/ui`, when it
  exists) → `@nx/react:library`; Nx plugins (`plugins/*`) → `@nx/plugin:plugin` (+
  `@nx/plugin:generator` for each generator).
- After generating, add the publish fields other packages have (`publishConfig` →
  `https://npm.pkg.github.com`, `repository` with `directory`, `files: ["dist"]`, no `private`)
  — the generator does not add them.
- To move/rename a project use `pnpm nx g @nx/workspace:move --projectName <name> --destination
packages/<scope>/<name>`, then clean stale `dist/`/`node_modules/` left at the old path.

## TypeScript project references

`tsconfig.json` (root) and each package's `tsconfig.lib.json` references are **managed by
`nx sync`** — never edit reference arrays by hand. `nx sync` runs automatically before
`build`/`typecheck`; run it manually if Nx reports the workspace out of sync. Runtime-specific
compiler options (e.g. `"types": ["node"]` for `server/*`, DOM libs for `client/*`) go in the
package's own `tsconfig.lib.json`.

## pnpm specifics

- Workspace globs are `packages/*` **and** `packages/*/*` (`pnpm-workspace.yaml`) — a new
  grouping folder level requires updating them.
- `allowBuilds` in `pnpm-workspace.yaml` must keep `nx: true` or every install fails on nx's
  postinstall script.
