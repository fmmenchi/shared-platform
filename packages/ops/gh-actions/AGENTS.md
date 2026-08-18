# AGENTS.md — @fmmenchi/gh-actions

Reusable GitHub Actions toolkit for `@fmmenchi` consumers (all nx workspaces). Part of
`shared-platform`; workspace contract in [../../../AGENTS.md](../../../AGENTS.md). Scope `ops`,
`private` (versioned + tagged, **not** published to npm). Consumer usage — [README](./README.md);
long-form [concepts](./docs/concepts/index.md) / [guides](./docs/index.md) /
[reference](./docs/reference/workflows.md) live in [`docs/`](./docs/index.md).

## Shape

- **Composite actions** in `actions/` (`setup`, `compute-context`, `trivy-scan`, `release`,
  `attach-sbom`, `notify`) — thin glue over `@fmmenchi/nx-trivy` (an nx plugin, run as a target) and
  `@fmmenchi/ci`'s bins (`fmmenchi-release`, `fmmenchi-notify`), plus pure-computation bricks
  (`compute-context` derives the canonical run
  context — event kind, release flag, sha/ref slugs — once, for every downstream job). One source of
  truth: plugin logic is never duplicated here.
- **Reusable workflows** live at `../../../.github/workflows/{security,docs}.reusable.yml` (GitHub
  only discovers reusable workflows under `.github/workflows/`), and reference the actions above.
  **Release is bricks only** — there is no `release.reusable.yml`, by the rule below.
- The `src/` TS is scaffolding only (the lib carries no code) — it exists so nx has a project to
  version/tag.

## Rules

- **Actions reference the packages, never inline trivy/slack** — an action shells out to
  `pnpm nx run <project>:<target>` (trivy) or to a bin (`pnpm exec fmmenchi-release`,
  `pnpm exec fmmenchi-notify`). Keep it that way (no duplication).
- **A task on the workspace is a plugin; an event passing through is a bin.** Trivy scanning is a
  target with options, configurations and inference — a plugin earns that. Announcing is a one-shot
  side effect with no per-project configuration: once the event carried its own identity there was
  nothing left for a target to hold, so `@fmmenchi/nx-notify` was deleted rather than rewritten.
- **Never name a project in an action.** `@fmmenchi/nx-trivy:scan-docker` exists only in this repo,
  where the plugin is a project. Ask the graph instead (`nx show projects --with-target <t> --json`,
  take the first) and **fail when the answer is empty** — `nx run-many` exits 0 on no matches
  (measured), which would turn an unregistered plugin into a green security job that scanned nothing.
- **A reusable workflow only for a job that is self-contained and parametric.** `security` and `docs`
  qualify: nothing about them is ordered against the caller's other jobs, and everything repo-shaped
  is an input. A **release** is neither — it must run after the caller's checks (and a called workflow
  cannot require that of its caller: only `needs:`/`workflow_run`/an approval `environment` in the
  caller can), and it must run a script from a path that differs between a consumer
  (`node_modules/@fmmenchi/ci/…`) and this repo (source, no `node_modules/@fmmenchi` at all — so the
  old `release.reusable.yml` could never be dogfooded here, and never was). Work like that ships as
  bricks plus a documented job; the ordering decision stays with whoever owns the pipeline.
- **An action and the targets it invokes ship in TWO releases, never one.** The reusable workflows
  reference the actions by an exact tag, so a released action keeps running until somebody bumps that
  pin. Moving the trivy scan targets and updating `trivy-scan` in the same merge proved the cost: the
  tagged action still asked for `@fmmenchi/nx-trivy:scan-docker`, which had just stopped existing, and
  the security job died with `Cannot find configuration for task`. Release the tolerant action first,
  then bump the pin.
- **Dogfooding through the reusable is not dogfooding the action.** `ci.yml` uses the local action
  paths, but `security.yml` calls `security.reusable.yml`, and a reusable workflow cannot use `./`
  (GitHub resolves a relative `uses:` against the CALLER's checkout, which for a consumer is their
  repo). So the security path always runs the **published** action — that gap is why the rule above
  exists.
- **Every composite `run:` step needs `shell: bash`** (composite-action requirement).
- **`nx`-safe references only.** Actions are referenced by repo path + tag
  (`fmmenchi/shared-platform/packages/ops/gh-actions/actions/<name>@gh-actions/v0.1.2`); the reusable
  workflow by `.github/workflows/security.reusable.yml@gh-actions/v0.1.2`. Never `@fmmenchi/…@x.y.z` (the
  leading `@` clashes with the `uses:` `path@ref` delimiter).
- **Versioning is automatic, and NOTHING MOVES.** `nx release` tags `gh-actions/v{version}` from
  conventional commits, in its own release group. There is no moving major alias: moving a tag is a
  force-push that GitHub refuses from Actions (the `GITHUB_TOKEN` cannot hold the `workflows`
  permission), and a movable tag is how `tj-actions/changed-files` was compromised in 2025. Consumers
  pin exact tags and Dependabot bumps them. Never tag by hand, never re-point a tag.
- **Dogfood via local path.** This repo's own `security.yml` / `ci.yml` consume the actions via
  `./packages/ops/gh-actions/actions/…` — what's exported is what's run.

`CLAUDE.md` is a symlink to this file — edit `AGENTS.md` only.
