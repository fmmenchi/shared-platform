# Reusable CI — composite actions & workflows

Shared GitHub Actions building blocks for `@fmmenchi` consumers. The **logic** lives in the nx
plugins (`@fmmenchi/nx-trivy`, `@fmmenchi/nx-notify`); these are the thin **glue** that wires them
into CI, so there's one source of truth. **Consumers must be nx workspaces** with the relevant
plugins installed.

Reference them pinned to the moving major tag **`@gh-actions/v0`** (a breaking change graduates to `v1`):

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
    uses: fmmenchi/shared-platform/.github/workflows/security.reusable.yml@gh-actions/v0
    # alert to Slack only on the scheduled run (a PR already shows a red check)
    with:
      alert-on-failure: ${{ github.event_name == 'schedule' }}
    secrets: inherit
```

## Turnkey: the reusable release workflow

Version + tag the affected projects, attach an SBOM to each release, and announce each to Slack —
on push to your main (needs `@fmmenchi/ci` installed and the same nx release setup):

```yaml
# .github/workflows/release.yml in a consumer repo
name: Release
on:
  push:
    branches: [main]
jobs:
  release:
    uses: fmmenchi/shared-platform/.github/workflows/release.reusable.yml@gh-actions/v0
    secrets: inherit
```

## Building blocks (composite actions)

Weave these into your own jobs when the turnkey workflow isn't enough. Run `setup` first — the others
shell out to nx.

| Action                                                                         | Does                                                                                                           |
| ------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------- |
| `fmmenchi/shared-platform/packages/ops/gh-actions/actions/setup@gh-actions/v0` | pnpm + Node + frozen install (`registry-url` input for publishing jobs)                                        |
| `.../gh-actions/actions/trivy-scan@gh-actions/v0`                              | vuln + secret scan via `@fmmenchi/nx-trivy`, per-day DB cache                                                  |
| `.../gh-actions/actions/attach-sbom@gh-actions/v0`                             | per-tag CycloneDX SBOM (`tags-file` input) → uploaded to each Release as `sbom.cdx.json`                       |
| `.../gh-actions/actions/announce-releases@gh-actions/v0`                       | announce every newly-released package (`tags-file`) to Slack via `@fmmenchi/nx-notify`                         |
| `.../gh-actions/actions/slack-notify@gh-actions/v0`                            | `@fmmenchi/nx-notify` release/error announce for one message (`type` input); skips green without Slack secrets |

## Versioning

This is a real nx library (`@fmmenchi/gh-actions`, `scope:ops`, `private` — versioned but not
published to npm). `nx release` versions and tags it **automatically** from conventional commits
(`feat(gh-actions)` / `fix(gh-actions)`), in its own release group — exactly like the `@fmmenchi/*`
packages, no hand-tagging. Its tags are `uses`-safe (slash-scoped, so no `@` clash):

- `@gh-actions/v0` — **moving major**: you get compatible fixes automatically. The everyday pin.
  The CI release job moves it to the latest exact tag after each release.
- `@gh-actions/v0.1.0` — an **exact** version (whatever nx cut), if you want to freeze it. Pin `@<sha>` for the strongest freeze.
- A breaking change graduates to `@gh-actions/v1` (and the `gh-actions/v0` tag stops moving); you migrate explicitly.

(The `@fmmenchi/*` package tags — `@fmmenchi/notify@0.0.4` — can't be reused here: a leading `@` in a
`uses:` ref clashes with the `path@ref` delimiter. Same semver spirit, `uses`-safe spelling.)

shared-platform **dogfoods** these: its own `security.yml` and the `ci.yml` release job consume the
same bricks via a local `./packages/ops/gh-actions/actions/...` reference, so what's exported is what's run.
