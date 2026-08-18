---
title: Run a security scan
sidebar_label: Run a security scan
sidebar_position: 1
---

# Run a security scan

A vulnerability + secret scan, with an optional Slack alert. Four steps in a job you own.

## Intent

A scan is not a test. A test goes red because your **code** changed; a scan goes red because the
**world** changed — a CVE was published against a dependency nobody touched. So it wants two
triggers: when your dependencies change, and on a schedule.

## The job

```yaml
# .github/workflows/security.yml
name: Security

on:
  pull_request:
    paths: ['pnpm-lock.yaml', '**/package.json']
  push:
    branches: [main]
    paths: ['pnpm-lock.yaml', '**/package.json']
  schedule:
    - cron: '0 6 * * 1' # Monday 06:00 UTC — when the world changes
  workflow_dispatch:

env:
  HUSKY: 0 # a CI install must not run git hooks

jobs:
  scan:
    name: Vulnerabilities & secrets
    runs-on: ubuntu-latest
    # `packages: read` is what lets the frozen install fetch private @fmmenchi dependencies.
    # A job-level block REPLACES the workflow-level one, so name every scope the job needs.
    permissions:
      contents: read
      packages: read
      actions: read # the alert asks the API which jobs and steps failed
    steps:
      - uses: actions/checkout@v7

      - uses: fmmenchi/shared-platform/packages/ops/gh-actions/actions/setup@gh-actions/v0.3.1
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}

      - uses: fmmenchi/shared-platform/packages/ops/gh-actions/actions/trivy-scan@gh-actions/v0.3.1
        with:
          cache-db: false # see below
          report: trivy-report.json # so the alert can carry it

      # The message is not written here: the brick asks GitHub which jobs and steps failed.
      # The report rides along, in the message's own thread.
      - name: Alert Slack with the report
        if: ${{ failure() }}
        uses: fmmenchi/shared-platform/packages/ops/gh-actions/actions/notify-failure@gh-actions/v0.3.1
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
          bot-token: ${{ secrets.SLACK_BOT_TOKEN }}
          channel-id: ${{ secrets.SLACK_CHANNEL_ID }}
          attachments: trivy-report.json
```

## Two files, not one

Above is the **weekly** shape. The dependency-change scan wants the opposite settings — DB cache
**on**, no Slack (a PR already shows a red check) — so it belongs in its own workflow rather than
behind an `if:` on every line that differs. That is how this repo runs it: `security.yml` on
dependency changes, `weekly-audit.yml` on the clock. Only the second one alerts, and only the second
one writes a report.

## The two settings worth a thought

**`cache-db`.** Trivy's DB is ~100 MiB to download, ~70 MiB to store, and expires in about 21 hours.
Scanning on every dependency change, caching pays for itself. Scanning **weekly only**, it cannot:
the restored copy is always stale, Trivy throws it away and downloads a fresh one, and the run still
uploads another 70 MiB for a next run that will do the same. Turn it off there.

**The install token, not a registry URL.** If your lockfile holds `@fmmenchi/*` from GitHub
Packages, the frozen install needs `packages: read` and a token. Map the scope in your own `.npmrc`
(`@fmmenchi:registry=https://npm.pkg.github.com`) and pass `github-token` — do **not** pass
`registry-url` for this: `actions/setup-node` turns that into a _global_ `registry=` line and your
public dependencies would be fetched from GitHub Packages too.

## Prerequisites

`@fmmenchi/nx-trivy` installed and registered in `nx.json` (`pnpm nx add @fmmenchi/nx-trivy` does
both). The scan brick names no project — it asks your graph which one owns `scan-docker` and
**fails** when nothing does, because an unregistered plugin would otherwise be a green job that
scanned nothing.

## Why this is a job and not a one-line `uses:`

There **was** a `security.reusable.yml`, and it was deleted. See
[reusable workflows](../reference/workflows.md) for what went wrong: GitHub runs a reusable workflow
only from `.github/workflows/`, where a file belongs to no nx project — so nothing released it and
nothing checked it, and it rotted in public.

## Related

- [Compose the building blocks](./compose-bricks.md) — the release job, the same way.
- [Composite actions reference](../reference/actions.md) — every input.
