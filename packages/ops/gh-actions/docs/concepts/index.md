---
title: Concepts
sidebar_label: Concepts
sidebar_position: 3
---

# Concepts

## Two ways to reuse

GitHub gives two native mechanisms, with opposite ergonomics — this toolkit ships both:

- **Reusable workflow** (`*.reusable.yml`, `on: workflow_call`) — a whole **job**, called with
  `uses:` at the job level. Turnkey: you get checkout + setup + scan (or a docs deploy) in one line.
  You own the triggers; you can't add steps to that job.
- **Composite action** (a "brick", under `actions/`) — a block of **steps**, used with `uses:` at
  the step level inside your own job. Compose them by hand when the turnkey workflow isn't enough.

A reusable workflow has **no triggers of its own**, so it can't run alone — it only runs when called.
That's why a consumer keeps a plain workflow (with `on: push/pull_request/schedule`) that either
calls a reusable workflow or wires the bricks directly.

### Which of the two, and why release is bricks

A job earns a **reusable workflow** when it is _self-contained_ (nothing about it is ordered against
your other jobs) and _parametric_ (everything repo-shaped is an input). `security` and `docs` are
both: a scan depends on no build of yours, and the docs site is named by an input.

A **release** is neither, so it ships as bricks plus [a documented job](../guides/compose-bricks.md#the-release-job):

- It must run **after** your checks — and a called workflow cannot require that. Only the caller can
  express it, with `needs:`, a `workflow_run` trigger, or an approval `environment`. A turnkey
  release would hide the one decision that is actually yours and enforce none of it.
- It has to run the release script from a path that depends on how the repo is built:
  `node_modules/@fmmenchi/ci/…` in a consumer, but source in `shared-platform`, which has no
  `node_modules/@fmmenchi` at all. The `release.reusable.yml` that used to live here could therefore
  never run in the repo that published it — and a brick nobody can run is a brick nobody should
  trust.

## The logic lives in the plugins — the toolkit is glue

Scanning, SBOMs and Slack announcements are nx **executors** in `@fmmenchi/nx-trivy` and
`@fmmenchi/ci`'s bins. The bricks don't reimplement any of that; they run them. One source of
truth.

### Genericity: bricks run `<your-project>:<target>`, never the plugin's own target

A plugin's targets (e.g. `@fmmenchi/nx-trivy:scan-docker`) exist only where the plugin is itself an
nx **project** — i.e. only in this monorepo. In a consumer the plugin is an installed dependency,
**not** a project, so that target doesn't exist. **A brick must therefore never name a project.**
The targets land on _your_ projects two ways, and the bricks handle both:

- **Inferred** via `createNodesV2` (matched by `**/package.json`, any layout) — `nx-trivy` infers the
  four scan targets onto your **workspace root project**.
- **Generated**, when what you are writing down is a decision that cannot be derived — which today
  is nothing in this toolkit's path: even the `sbom` target is inferred, and the release record
  decides who gets one ([ADR-0031](../../../adr/0031-being-describable-is-a-fact.md)).

Either way the brick asks the graph who owns the target (`nx show projects --with-target …`) and runs
`<project>:<target>`, which works in any nx workspace. When the answer is empty the brick **fails**:
`nx run-many` would exit 0 on no matches (measured), and a security scan that silently did not happen
is worse than one that fails.

## Versioning — `gh-actions/v{version}`

This is a real nx library (`@fmmenchi/gh-actions`, `scope:ops`, `private` — versioned + tagged, not
published to npm). `nx release` tags it **automatically** from conventional commits, in its own
release group, as `gh-actions/v{version}` — **`uses`-safe** (slash-scoped: a leading `@` like the
`@fmmenchi/*` package tags would clash with the `uses: path@ref` delimiter). Consumers pin an exact
one; **nothing moves a tag**, here or anywhere else in this toolkit.

### Why no moving major tag

It was tried, and it failed in both ways a thing can fail.

Operationally: moving a tag is a force-push, and GitHub refuses a ref push from Actions when the
target commit's `.github/workflows/` differs from any branch tip — the `GITHUB_TOKEN` is an App token
and cannot hold the `workflows` permission, which is not even expressible in a workflow's
`permissions:` block. Every release therefore ended with a red step after a successful release. The
usual workaround is a long-lived PAT with the `workflow` scope, i.e. a permanent right to rewrite
this repository's CI, kept in a secret, so that a tag can move.

And by design: a tag that someone can move is a decision about _what code you run_ taken by somebody
other than you. That is precisely how `tj-actions/changed-files` was compromised in March 2025 —
existing version tags were rewritten to point at a malicious commit, and 20k repositories ran it
without changing a line.

So the tags stand still and Dependabot proposes the bumps. The cost is real and worth naming: an
action and the targets it invokes now ship in two releases, explicitly, with a pin bump in between —
where the alias used to paper over that with a delay nobody could see.
