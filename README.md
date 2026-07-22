# shared-platform

Private, versioned monorepo of the shared layers behind my services — UI, AI, data access,
security, prompts, analytics, MCP — released independently per package.

Apps and services live in their own repositories and consume these layers from **GitHub
Packages** as `@fmmenchi/<name>`. This repo contains only libraries — abstract, independent
layers, never project implementations.

## Layout

```
packages/
  shared/           # isomorphic (no DOM, no Node APIs) — core, api-contracts
  client/           # browser-only — api-client, tokens, ui-ports, ui (design system)
  server/           # Node-only — config, …
  plugins/          # Nx plugins, consumed as devDeps by the other repos
  tools/            # scripts
```

The design system (`@fmmenchi/tokens` + `@fmmenchi/ui-ports` + `@fmmenchi/ui`) is native-first,
provider-agnostic, Tailwind-themed, with Storybook (MCP) and browser-mode component tests. See
[ADR-0001](./doc/adr/0001-ui-library-foundations.md) and [.agents/doc/ui.md](./.agents/doc/ui.md).

`client` and `server` may depend on `shared`, never on each other, and nothing depends on
`plugins`/`tools` — enforced by ESLint module boundaries and by the workspace dependency graph. Details in [doc/architecture.md](./doc/architecture.md).

## Quickstart

```bash
pnpm install
pnpm exec playwright install chromium              # once, for browser-mode tests
pnpm nx run-many -t typecheck build lint test build-storybook   # full local gate
pnpm nx storybook @fmmenchi/ui                     # Storybook + MCP at :6006/mcp
pnpm nx graph                                      # explore the workspace
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
  [styling the design system](./doc/styling.md) ·
  [consuming packages from an app](./doc/consuming-packages.md) ·
  [architecture decision records](./doc/adr)
- **AI agents** — [AGENTS.md](./AGENTS.md) (hub) + [.agents/doc/](./.agent) topic spokes
  (`CLAUDE.md` is a symlink to `AGENTS.md`)
