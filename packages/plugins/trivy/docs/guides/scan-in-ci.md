---
title: Scan in CI
sidebar_label: Scan in CI
sidebar_position: 2
---

# Scan in CI

Run the Trivy scan in continuous integration with the Docker runner, and decide whether to cache
the vulnerability database.

## Intent

CI runners rarely have the `trivy` CLI installed but almost always have Docker. The Docker runner
runs the scan inside the `aquasec/trivy` image, so the workflow needs only Docker — no CLI
install step.

## Step 1: Run the scan with the Docker runner

```bash
pnpm nx run <project>:scan --runner=docker
```

The `--runner=docker` flag runs the `scan` executor inside the `aquasec/trivy` image. It mounts the
workspace at `/workspace` and runs the same default scan: `trivy fs --scanners vuln --severity CRITICAL,HIGH --format table --exit-code 1 .`.
A CRITICAL or HIGH finding exits non-zero and fails the job.

Want to invoke it by name (`<project>:scan-docker`) instead of passing the flag? The plugin is
executor-only — it does **not** infer a `scan-docker` target onto your project, so define one
yourself alongside `scan`:

```jsonc
"scan-docker": { "executor": "@fmmenchi/nx-trivy:scan", "options": { "runner": "docker" } }
```

(That's exactly what `shared-platform` does to dogfood the plugin — the target lives in the plugin's
own project config.)

## Step 2: Choose a trigger cadence

A fresh vulnerability DB catches newly disclosed CVEs even when nothing in the code changed, so a
good pattern is **on dependency changes plus a periodic schedule**. This is exactly how
`shared-platform` dogfoods the plugin — its `security.yml` workflow runs `scan-docker` on dep
changes and on a weekly schedule, and the weekly run's findings are announced to Slack via the
`@fmmenchi/nx-notify` plugin.

## Step 3: Decide on DB caching

By default the docker runner caches the vuln DB in a **named volume** (`trivy-cache`) — persistent
locally, but not across ephemeral CI runners. To persist it in CI, bind-mount a host directory with
`cacheDir` so a cache action can save and restore it:

```bash
pnpm nx run <project>:scan --runner=docker --cacheDir=$PWD/.trivy-cache
```

`cacheDir` must be an **absolute host path** — it becomes the source of a Docker bind-mount
(`-v <cacheDir>:/root/.cache/trivy`), and Docker rejects a relative source like `.trivy-cache`. Then
cache that directory (e.g. `$GITHUB_WORKSPACE/.trivy-cache`) with your CI's cache step, such as
`actions/cache`.

:::tip[When caching is worth it]

At a **weekly** cadence the DB's roughly one-day TTL makes any restored cache stale — Trivy
re-pulls the DB regardless, so `shared-platform` does **not** cache it. `cacheDir` pays off for
consumers that scan frequently enough that a warm DB actually saves a download.

:::

## Related

- [Run a scan](./run-a-scan.md) — the local-first workflow and option tuning.
- [Executors reference](../reference/executors.md) — the `scan-docker` target and `cacheDir` option.
