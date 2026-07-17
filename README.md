# shared-platform

Private, versioned monorepo of the shared layers behind my services — UI, AI, data access,
security, prompts, analytics, MCP — released independently per package.

Apps live in their own repositories and consume these layers from **GitHub Packages** as
`@fmmenchi/<name>`. This repo contains only libraries.

## Layout

```
packages/
  shared/           # isomorphic (no DOM, no Node APIs) — e.g. core, api-contracts, design-tokens
  client/           # browser-only layers — e.g. api-client, ui
  server/           # Node-only layers — e.g. config, data access, MCP
  plugins/          # Nx plugins, consumed as devDeps by the other repos
  tools/            # scripts
```

`client` and `server` may depend on `shared`, never on each other, and nothing depends on
`plugins`/`tools` — enforced by ESLint module boundaries and by the workspace dependency graph. Details in [doc/architecture.md](./doc/architecture.md).

## Quickstart

```bash
pnpm install
pnpm nx run-many -t typecheck build lint     # full local gate
pnpm nx graph                                # explore the workspace
```

New package (official generator only):

```bash
pnpm nx g @nx/js:library packages/<scope>/<name> --linter=eslint --tags=scope:<scope>,type:<type>
```

## Releases

Conventional Commits (enforced by commitlint) drive `nx release` in **independent** mode: each
package gets its own version, `CHANGELOG.md`, tag (`@fmmenchi/<name>@<version>`) and GitHub
Release, and is published to GitHub Packages.

```bash
pnpm nx release --dry-run     # preview
pnpm nx release               # version + changelog + tag + publish
```

## Documentation

- **Humans** — [doc/](./doc): [architecture](./doc/architecture.md) ·
  [consuming packages from an app](./doc/consuming-packages.md)
- **AI agents** — [AGENTS.md](./AGENTS.md) (hub) + [.agent/](./.agent) topic spokes
  (`CLAUDE.md` is a symlink to `AGENTS.md`)
