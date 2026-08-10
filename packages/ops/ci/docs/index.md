---
title: '@fmmenchi/ci'
sidebar_label: ci
sidebar_position: 0
---

# @fmmenchi/ci

Release helper scripts for the CI job of an `nx release` monorepo. Small, tested and importable — the
CI-only shell wiring stays in the workflow, where it belongs.

`nx release` already versions only the projects with releasing conventional commits: a docs- or
config-only push releases nothing, and a change that legitimately affects everything (`nx.json`, the
lockfile) releases everything. **No affected pre-filter is needed** — nx does the right thing on its
own. These scripts wrap the two things it does not give you.

## Prerequisites

- An **`nx release`** workspace with conventional commits.
- A CI job with `contents: write` (tags and releases) and, if it publishes, `packages: write`.

## 🚀 Guides

- [Release from CI](./guides/release-from-ci.md) — run `nx release` and hand the newly cut tags to
  the steps that follow.
- [Keep a moving major alias](./guides/keep-a-major-alias.md) — the `v0` a consumer pins, moved to
  the latest exact tag.

## 📚 Reference

- [Scripts and API](./reference/scripts.md) — both scripts, every environment variable, and the three
  pure functions behind them.

## 🏗 Concepts

- [Concepts](./concepts/index.md) — why there is no affected pre-filter, why a package tag is not a
  toolkit tag, and why the logic is separated from the side effects.
