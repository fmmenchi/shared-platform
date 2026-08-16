# AGENTS.md — @fmmenchi/gh-actions

Reusable GitHub Actions toolkit for `@fmmenchi` consumers (all nx workspaces). Part of
`shared-platform`; workspace contract in [../../../AGENTS.md](../../../AGENTS.md). Scope `ops`,
`private` (versioned + tagged, **not** published to npm). Consumer usage — [README](./README.md);
long-form [concepts](./docs/concepts/index.md) / [guides](./docs/index.md) /
[reference](./docs/reference/workflows.md) live in [`docs/`](./docs/index.md).

## Shape

- **Composite actions** in `actions/` (`setup`, `compute-context`, `trivy-scan`, `attach-sbom`,
  `announce-releases`, `slack-notify`) — thin glue that wraps the nx plugins (`@fmmenchi/nx-trivy`,
  `@fmmenchi/nx-notify`), plus pure-computation bricks (`compute-context` derives the canonical run
  context — event kind, release flag, sha/ref slugs — once, for every downstream job). One source of
  truth: plugin logic is never duplicated here.
- **Reusable workflow** lives at `../../../.github/workflows/security.reusable.yml` (GitHub only
  discovers reusable workflows under `.github/workflows/`), and references the actions above.
- The `src/` TS is scaffolding only (the lib carries no code) — it exists so nx has a project to
  version/tag.

## Rules

- **Actions reference the plugins, never inline trivy/slack** — consumers are nx workspaces, so the
  action shells out to `pnpm nx run <project>:<target>`. Keep it that way (no duplication).
- **Never name a project in an action.** `@fmmenchi/nx-trivy:scan-docker` exists only in this repo,
  where the plugin is a project. Ask the graph instead (`nx show projects --with-target <t> --json`,
  take the first) and **fail when the answer is empty** — `nx run-many` exits 0 on no matches
  (measured), which would turn an unregistered plugin into a green security job that scanned nothing.
- **An action and the targets it invokes ship in TWO releases, never one.** The reusable workflows
  reference the actions by tag (`@gh-actions/v0`), and that alias only moves **after** the release
  job runs — so for one cycle the OLD action runs against the NEW workspace. Moving the trivy scan
  targets and updating `trivy-scan` in the same merge did exactly that: the tagged action still asked
  for `@fmmenchi/nx-trivy:scan-docker`, which had just stopped existing, and the security job died
  with `Cannot find configuration for task`. Either release the tolerant action first, or expect one
  red run and re-run after the alias moves.
- **Dogfooding through the reusable is not dogfooding the action.** `ci.yml` uses the local action
  paths, but `security.yml` calls `security.reusable.yml`, and a reusable workflow cannot use `./`
  (GitHub resolves a relative `uses:` against the CALLER's checkout, which for a consumer is their
  repo). So the security path always runs the **published** action — that gap is why the rule above
  exists.
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
