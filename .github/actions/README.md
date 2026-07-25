# Reusable CI — composite actions & workflows

Shared GitHub Actions building blocks for `@fmmenchi` consumers. The **logic** lives in the nx
plugins (`@fmmenchi/nx-trivy`, `@fmmenchi/nx-notify`); these are the thin **glue** that wires them
into CI, so there's one source of truth. **Consumers must be nx workspaces** with the relevant
plugins installed.

Reference them pinned to the moving major tag **`@v1`** (breaking changes go to `v2`):

## Turnkey: the reusable security workflow

One job, one line — vuln + secret scan with a cached DB, and an optional Slack alert:

```yaml
# .github/workflows/security.yml in a consumer repo
name: Security
on:
  pull_request:
    paths: ['pnpm-lock.yaml', '**/package.json']
  push:
    branches: [main]
    paths: ['pnpm-lock.yaml', '**/package.json']
  schedule:
    - cron: '0 6 * * 1'
jobs:
  security:
    uses: fmmenchi/shared-platform/.github/workflows/security.reusable.yml@v1
    # alert to Slack only on the scheduled run (a PR already shows a red check)
    with:
      alert-on-failure: ${{ github.event_name == 'schedule' }}
    secrets: inherit
```

## Building blocks (composite actions)

Weave these into your own jobs when the turnkey workflow isn't enough. Run `setup` first — the others
shell out to nx.

| Action                                              | Does                                                                                           |
| --------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `fmmenchi/shared-platform/.github/actions/setup@v1` | pnpm + Node + frozen install (`registry-url` input for publishing jobs)                        |
| `.../actions/trivy-scan@v1`                         | vuln + secret scan via `@fmmenchi/nx-trivy`, per-day DB cache                                  |
| `.../actions/attach-sbom@v1`                        | per-tag CycloneDX SBOM (`tags-file` input) → uploaded to each Release as `sbom.cdx.json`       |
| `.../actions/slack-notify@v1`                       | `@fmmenchi/nx-notify` release/error announce (`type` input); skips green without Slack secrets |

## Versioning

`@v1` is a **moving major tag** — you get compatible fixes automatically. Pin `@<sha>` for a frozen
version, or subscribe to `v2` when a breaking change ships.

shared-platform **dogfoods** these: its own `security.yml` and the `ci.yml` release job consume the
same bricks via a local `./.github/actions/...` reference, so what's exported is what's run.
