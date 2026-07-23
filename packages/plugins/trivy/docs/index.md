---
title: '@fmmenchi/nx-trivy'
---

# @fmmenchi/nx-trivy

Nx executor that runs [Trivy](https://trivy.dev) security scans as an Nx target. Defaults to a
**workspace-wide dependency-vulnerability scan** that fails on CRITICAL/HIGH — the right level for a
monorepo, where deps resolve through a single root lockfile.

## Install

```bash
pnpm add -D @fmmenchi/nx-trivy
```

## Usage

Add the target to any project — it scans the workspace root either way:

```jsonc
"scan": { "executor": "@fmmenchi/nx-trivy:scan" }
```

```bash
# trivy fs --scanners vuln --severity CRITICAL,HIGH --exit-code 1 .
pnpm nx run <project>:scan
# same, via the aquasec/trivy Docker image — no local trivy needed
pnpm nx run <project>:scan --runner=docker
```

## Runners

- **`local`** (default) — the `trivy` CLI must be on PATH (`brew install trivy`).
- **`docker`** — runs the `aquasec/trivy` image, mounting the workspace at `/workspace` and caching
  the vuln DB in a named volume. Only Docker is required — ideal for CI.

## Options

Trivy's own flag vocabulary: `scanners` (default `vuln`), `severity` (default `CRITICAL,HIGH`),
`failOnFindings` (default `true`), `format`, `ignorefile`, `scanType`, `path`, `extraArgs`; plus
`runner` and `dockerImage`.

## Reference

- Source: `packages/plugins/trivy`
