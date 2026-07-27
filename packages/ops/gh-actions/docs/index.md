---
title: '@fmmenchi/gh-actions'
sidebar_label: gh-actions
sidebar_position: 0
---

# @fmmenchi/gh-actions

A **reusable CI toolkit** for `@fmmenchi` consumers — turnkey GitHub Actions **reusable workflows**
(security, release, docs) plus the **composite actions** they're built from. The logic lives in the
nx plugins (`@fmmenchi/nx-trivy`, `@fmmenchi/nx-notify`); these are the thin, versioned glue that
wires them into CI, so there's one source of truth.

Pin everything to the moving major tag **`@gh-actions/v0`**.

## Prerequisites

- The consumer repo is an **nx workspace** with the relevant plugins installed
  (`pnpm add -D @fmmenchi/nx-trivy @fmmenchi/nx-notify @fmmenchi/ci`).
- Those plugins are registered in the root **`nx.json` `plugins`** (so the `sbom` / `announce-*`
  targets are inferred onto your packages).
- For **private** repos in the same org: _Settings → Actions → General → Access_ → allow other repos
  in the org to use these workflows/actions.

## 🚀 Guides

- [Reuse a whole workflow](./guides/reuse-a-workflow.md) — call `security`/`release`/`docs` in one line.
- [Compose the building blocks](./guides/compose-bricks.md) — weave the composite actions into your own job.

## 📚 Reference

- [Reusable workflows](./reference/workflows.md) — `security`/`release`/`docs`, with every input.
- [Composite actions](./reference/actions.md) — the five bricks, with every input.

## 🏗 Concepts

- [Concepts](./concepts/index.md) — reusable workflow vs. brick vs. plugin, the genericity rule
  (inference), and the `gh-actions/v{version}` versioning.
