---
title: '@fmmenchi/nx-trivy'
sidebar_label: nx-trivy
sidebar_position: 0
---

# @fmmenchi/nx-trivy

Nx executor that runs [Trivy](https://trivy.dev) security scans as an Nx target — a
**workspace-wide dependency-vulnerability scan** that fails on CRITICAL/HIGH by default.

## Prerequisites

- An existing **Nx workspace** (the executor scans from `context.root`, the workspace root).
- **One** of the two runners:
  - **local** (default) — the `trivy` CLI on PATH (`brew install trivy`), or
  - **docker** — Docker on PATH; the scan runs inside the `aquasec/trivy` image, so no local
    `trivy` install is needed.

## 🚀 Guides

- [Run a scan](./guides/run-a-scan.md) — add the target, pick a runner, tune severity and scanners.
- [Scan in CI](./guides/scan-in-ci.md) — wire `scan-docker` into a workflow and cache the vuln DB.

## 📚 Reference

- [Executors](./reference/executors.md) — the `scan` executor and both targets, with every option.

## 🏗 Concepts

- [Concepts](./concepts/index.md) — why the scan is workspace-level, and how the runners work inside.
