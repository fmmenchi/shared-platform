# AGENTS.md — @fmmenchi/gh-actions

Reusable GitHub Actions toolkit for `@fmmenchi` consumers (all nx workspaces). Part of
`shared-platform`; workspace contract in [../../../AGENTS.md](../../../AGENTS.md). Scope `ops`,
`private` (versioned + tagged, **not** published to npm). Consumer usage — [README](./README.md);
long-form [concepts](./docs/concepts/index.md) / [guides](./docs/index.md) /
[reference](./docs/reference/workflows.md) live in [`docs/`](./docs/index.md).

## Shape

- **Composite actions** in `actions/` (`setup`, `trivy-scan`, `attach-sbom`, `slack-notify`) — thin
  glue that wraps the nx plugins (`@fmmenchi/nx-trivy`, `@fmmenchi/nx-notify`). One source of truth:
  the logic is in the plugins, never duplicated here.
- **Reusable workflow** lives at `../../../.github/workflows/security.reusable.yml` (GitHub only
  discovers reusable workflows under `.github/workflows/`), and references the actions above.
- The `src/` TS is scaffolding only (the lib carries no code) — it exists so nx has a project to
  version/tag.

## Rules

- **Actions reference the plugins, never inline trivy/slack** — consumers are nx workspaces, so the
  action shells out to `pnpm nx run @fmmenchi/nx-...`. Keep it that way (no duplication).
- **Every composite `run:` step needs `shell: bash`** (composite-action requirement).
- **`nx`-safe references only.** Actions are referenced by repo path + tag
  (`fmmenchi/shared-platform/packages/ops/gh-actions/actions/<name>@gh-actions/v0`); the reusable
  workflow by `.github/workflows/security.reusable.yml@gh-actions/v0`. Never `@fmmenchi/…@x.y.z` (the
  leading `@` clashes with the `uses:` `path@ref` delimiter).
- **Versioning is automatic.** `nx release` tags `gh-actions/v{version}` from conventional commits
  (`feat(gh-actions)`/`fix(gh-actions)`), in its own release group; the CI release job moves the
  `gh-actions/v0` moving-major alias. Never tag by hand.
- **Dogfood via local path.** This repo's own `security.yml` / `ci.yml` consume the actions via
  `./packages/ops/gh-actions/actions/…` — what's exported is what's run.

`CLAUDE.md` is a symlink to this file — edit `AGENTS.md` only.
