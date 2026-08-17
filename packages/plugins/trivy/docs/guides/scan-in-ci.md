---
title: Scan in CI
sidebar_label: Scan in CI
sidebar_position: 2
---

# Scan in CI

Run the Trivy scan in continuous integration with the Docker runner, and cache the vulnerability
database so frequent runs don't re-download it.

## Intent

CI runners rarely have the `trivy` CLI installed but almost always have Docker. The Docker runner
runs the scan inside the `aquasec/trivy` image, so the workflow needs only Docker — no CLI
install step.

## Step 1: Run the scan with the Docker runner

`scan-docker` is one of the four targets the plugin infers onto the workspace root project once it is
registered in `nx.json` (see [Run a scan](./run-a-scan.md)). It is a separate target rather than a
`--runner=docker` flag because nx reserves `--runner` for tasks-runner selection, so that flag never
reaches the executor.

It runs the `scan` executor inside the `aquasec/trivy` image, mounts the workspace at `/workspace`,
and runs the same default scan (`trivy fs --scanners vuln --severity CRITICAL,HIGH --format table --exit-code 1 .`).
A CRITICAL or HIGH finding exits non-zero and fails the job.

**Don't hardcode the project name in a workflow** — the root project is named after your root
`package.json`, so it differs in every repo. Ask the graph, and fail when the answer is empty:

```bash
host=$(pnpm nx show projects --with-target scan-docker --json \
  | node -p "(JSON.parse(require('fs').readFileSync(0,'utf8'))[0] ?? '')")
[ -n "$host" ] || { echo "::error::plugin not registered — run 'pnpm nx add @fmmenchi/nx-trivy'"; exit 1; }
pnpm nx run "$host:scan-docker"
```

The guard is not ceremony: `nx run-many -t scan-docker` **exits 0 when nothing matches** (measured),
so the obvious project-agnostic one-liner turns an unregistered plugin into a green build that never
scanned anything. The `trivy-scan` action in `@fmmenchi/gh-actions` does exactly the above for you.

## Step 2: Choose a trigger cadence

A fresh vulnerability DB catches newly disclosed CVEs even when nothing in the code changed, so a
good pattern is **on dependency changes plus a periodic schedule**. This is exactly how
`shared-platform` dogfoods the plugin — its `security.yml` workflow runs `scan-docker` on dep
changes and on a weekly schedule, and the weekly run's findings are announced to Slack via the
`notify` brick in `@fmmenchi/gh-actions`.

## Step 3: Cache the vulnerability DB

By default the docker runner caches the vuln DB in a **named volume** (`trivy-cache`) — persistent
locally, but lost on ephemeral CI runners. To persist it across runs, bind-mount a host directory
with `cacheDir` (a normal CLI option — unlike `--runner`, it isn't reserved) and cache that directory
with your CI's cache action:

```bash
pnpm nx run <root-project>:scan-docker --cacheDir="$RUNNER_TEMP/trivy-cache"
```

`cacheDir` must be an **absolute host path** — it becomes the source of a Docker bind-mount
(`-v <cacheDir>:/root/.cache/trivy`), and Docker rejects a relative source.

`shared-platform` does exactly this in `security.yml`: an `actions/cache` step keyed **per day**
(`trivy-db-<date>`, with a `trivy-db-` restore-key) wraps the scan, so the frequent dependency-change
runs reuse the DB instead of re-downloading ~100 MiB each time. Trivy re-validates the DB against its
own TTL, so a restored copy is never used past its shelf life. The docker runner writes the DB as
root, so a best-effort `chown` back to the runner user before the post-job save keeps it archivable.

:::note[Only the vuln scan needs the DB]

Secret scanning uses built-in rules and an SBOM is just a component listing — neither downloads the
DB, so `cacheDir` does nothing for them.

:::

## Related

- [Run a scan](./run-a-scan.md) — the local-first workflow and option tuning.
- [Executors reference](../reference/executors.md) — the `scan-docker` target and `cacheDir` option.
