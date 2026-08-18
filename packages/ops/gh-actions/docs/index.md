---
title: '@fmmenchi/gh-actions'
sidebar_label: gh-actions
sidebar_position: 0
---

# @fmmenchi/gh-actions

A **reusable CI toolkit** for `@fmmenchi` consumers: **composite actions** — bricks — that you wire
into jobs you own. The logic lives in the plugins and packages (`@fmmenchi/nx-trivy`,
`@fmmenchi/ci`, `@fmmenchi/notify`); these are the thin, versioned glue that wires them into CI, so
there's one source of truth.

There are **no reusable workflows**. All three that once shipped were removed —
[why](./reference/workflows.md), and it is worth two minutes before you ask for one back.

Pin everything to an **exact** tag — `@gh-actions/v0.3.1`. No tag is ever moved; Dependabot opens the bump PRs.

## Prerequisites

- The consumer repo is an **nx workspace** with the relevant plugins installed
  (`pnpm add -D @fmmenchi/nx-trivy @fmmenchi/ci`).
- Those plugins are registered in the root **`nx.json` `plugins`** — `pnpm nx add @fmmenchi/nx-trivy`
  does it for you — so the scan / `announce-*` targets are inferred onto your workspace.
- SBOMs need no wiring: every project with a package.json infers the target, and the release record decides which releases carry one.
- For **private** repos in the same org: _Settings → Actions → General → Access_ → allow other repos
  in the org to use these workflows/actions.

## 🚀 Guides

- [Run a security scan](./guides/run-a-security-scan.md) — vuln + secret scan, four steps.
- [Compose the building blocks](./guides/compose-bricks.md) — the release job, from bricks.
- [Deploy a docs site](./guides/deploy-a-docs-site.md) — GitHub Pages, with the one-deployment trap.

## 📚 Reference

- [Composite actions](./reference/actions.md) — the six bricks, with every input.
- [Reusable workflows](./reference/workflows.md) — there are none, and what each removal cost.

## 🏗 Concepts

- [Concepts](./concepts/index.md) — reusable workflow vs. brick vs. plugin, the genericity rule
  (inference), and the `gh-actions/v{version}` versioning.
