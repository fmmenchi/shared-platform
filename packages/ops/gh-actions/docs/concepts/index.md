---
title: Concepts
sidebar_label: Concepts
sidebar_position: 3
---

# Concepts

## Two ways to reuse

GitHub gives two native mechanisms, with opposite ergonomics — this toolkit ships both:

- **Reusable workflow** (`*.reusable.yml`, `on: workflow_call`) — a whole **job**, called with
  `uses:` at the job level. Turnkey: you get checkout + setup + scan (or release, or docs deploy) in
  one line. You own the triggers; you can't add steps to that job.
- **Composite action** (a "brick", under `actions/`) — a block of **steps**, used with `uses:` at
  the step level inside your own job. Compose them by hand when the turnkey workflow isn't enough.

A reusable workflow has **no triggers of its own**, so it can't run alone — it only runs when called.
That's why a consumer keeps a plain workflow (with `on: push/pull_request/schedule`) that either
calls a reusable workflow or wires the bricks directly.

## The logic lives in the plugins — the toolkit is glue

Scanning, SBOMs and Slack announcements are nx **executors** in `@fmmenchi/nx-trivy` and
`@fmmenchi/nx-notify`. The bricks don't reimplement any of that; they run the plugins. One source of
truth.

### Genericity: bricks run `<your-project>:<target>`, never the plugin's own target

A plugin's targets (e.g. `@fmmenchi/nx-trivy:scan-docker`) exist only where the plugin is itself an
nx **project** — i.e. only in this monorepo. In a consumer the plugin is an installed dependency,
**not** a project, so that target doesn't exist. So the plugins **infer** their per-package targets
onto _your_ projects via `createNodesV2` (matched by `**/package.json`, any layout): `nx-trivy`
infers `sbom`, `nx-notify` infers `announce-release`/`announce-error`. The bricks then run
`<project>:<target>`, which works in any nx workspace. Workspace-level concerns (the Trivy scan, the
failure alert) are a target you point the brick at, not a per-package inference.

## Versioning — `gh-actions/v{version}`

This is a real nx library (`@fmmenchi/gh-actions`, `scope:ops`, `private` — versioned + tagged, not
published to npm). `nx release` tags it **automatically** from conventional commits, in its own
release group, as `gh-actions/v{version}` — **`uses`-safe** (slash-scoped: a leading `@` like the
`@fmmenchi/*` package tags would clash with the `uses: path@ref` delimiter). The CI release job moves
the moving-major alias `gh-actions/v0`, which is what consumers pin.
