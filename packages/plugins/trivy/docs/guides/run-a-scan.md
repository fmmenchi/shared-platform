---
title: Run a scan
sidebar_label: Run a scan
sidebar_position: 1
---

# Run a scan

Add the `scan` target to a project and run a Trivy security scan over the workspace.

## Intent

You want to check the workspace's dependencies for known vulnerabilities and fail the build when
CRITICAL or HIGH findings appear. The scan always runs from the workspace root, so it does not
matter which project hosts the target — pick any one.

## Step 1: Add the target

Add a `scan` target to any project's `nx` config (its `package.json` or `project.json`):

```jsonc
// a target on any project — it scans the workspace root either way
"scan": { "executor": "@fmmenchi/nx-trivy:scan" }
```

## Step 2: Run it

```bash
# trivy fs --scanners vuln --severity CRITICAL,HIGH --format table --exit-code 1 .
pnpm nx run <project>:scan
```

With the local runner, the `trivy` CLI must be on PATH:

```bash
brew install trivy
```

:::tip[No local install?]

Use the Docker runner instead — it runs the `aquasec/trivy` image and needs only Docker:

```bash
pnpm nx run <project>:scan --runner=docker
```

Prefer running it by name? Add your own `scan-docker` target — the plugin does **not** infer one
onto your project (it's executor-only), so `<project>:scan-docker` won't exist until you define it:

```jsonc
// alongside your `scan` target — the runner baked in
"scan-docker": { "executor": "@fmmenchi/nx-trivy:scan", "options": { "runner": "docker" } }
```

:::

## Step 3: Tune the scan

Every option maps to a Trivy flag. A few common adjustments:

```bash
# add secret + misconfig scanners on top of vuln
pnpm nx run <project>:scan --scanners=vuln,secret,misconfig

# widen the severities that count
pnpm nx run <project>:scan --severity=CRITICAL,HIGH,MEDIUM

# report only, never fail the target (drops --exit-code 1)
pnpm nx run <project>:scan --failOnFindings=false

# emit SARIF instead of a table
pnpm nx run <project>:scan --format=sarif
```

See the [Executors reference](../reference/executors.md#scan) for the full option list and defaults.

## Step 4: Silence expected findings

Drop a `.trivyignore.yaml` at the scan root (the workspace root) — Trivy picks it up automatically,
no option required. To point at an ignore file elsewhere, pass `--ignorefile=<path>`.

## Related

- [Scan in CI](./scan-in-ci.md) — run the scan on a schedule and cache the vuln DB.
- [Concepts](../concepts/index.md) — why the scan is workspace-level.
