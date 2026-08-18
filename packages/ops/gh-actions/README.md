# Reusable CI — composite actions & workflows

Shared GitHub Actions building blocks for `@fmmenchi` consumers. The **logic** lives in the nx
plugins and packages (`@fmmenchi/nx-trivy`, `@fmmenchi/ci`, `@fmmenchi/notify`); these are the thin **glue** that wires them
into CI, so there's one source of truth. **Consumers must be nx workspaces** with the relevant
plugins installed.

Reference them pinned to an **exact** tag — `@gh-actions/v0.3.1`. There is no moving major tag; see [Versioning](#versioning).

## Security: a scan and an alert, in a job you own

Vuln + secret scan with a cached DB, and a Slack alert on the weekly run:

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
    - cron: '0 6 * * 1' # a scan goes red because the WORLD changed, not your code
env:
  HUSKY: 0
jobs:
  scan:
    runs-on: ubuntu-latest
    permissions: { contents: read, packages: read } # packages: read → the install can fetch @fmmenchi/*
    steps:
      - uses: actions/checkout@v7
      - uses: fmmenchi/shared-platform/packages/ops/gh-actions/actions/setup@gh-actions/v0.3.1
        with: { github-token: '${{ secrets.GITHUB_TOKEN }}' }
      - uses: fmmenchi/shared-platform/packages/ops/gh-actions/actions/trivy-scan@gh-actions/v0.3.1
        with: { cache-db: false } # weekly-only cadence: the cached DB has always expired
      - name: Alert Slack on findings
        if: ${{ failure() && github.event_name == 'schedule' }}
        uses: fmmenchi/shared-platform/packages/ops/gh-actions/actions/notify@gh-actions/v0.3.1
        with:
          kind: error
          message: 'The Trivy audit found CRITICAL/HIGH dependency vulnerabilities.'
          bot-token: '${{ secrets.SLACK_BOT_TOKEN }}'
          channel-id: '${{ secrets.SLACK_CHANNEL_ID }}'
```

There **was** a one-line `security.reusable.yml`, and it was deleted after it rotted in public: see
[reusable workflows](./docs/reference/workflows.md). Full walkthrough —
[run a security scan](./docs/guides/run-a-security-scan.md).

## Release is bricks, not a turnkey workflow

There is deliberately **no** `release.reusable.yml`. Releasing has to be sequenced against your own
checks, and a called workflow cannot require that of its caller — so the ordering stays where the
decision belongs, in your job graph. Compose the bricks (see
[compose the bricks](./docs/guides/compose-bricks.md) for the full job):

```yaml
jobs:
  gate: { … your typecheck / build / lint / test … }
  release:
    needs: gate # ← the part a reusable workflow could never enforce for you
    if: github.ref == 'refs/heads/main'
    concurrency: { group: release, cancel-in-progress: false }
    steps:
      - uses: actions/checkout@v7
        with: { fetch-depth: 0 }
      - uses: fmmenchi/shared-platform/packages/ops/gh-actions/actions/setup@gh-actions/v0.1.2
        with: { registry-url: 'https://npm.pkg.github.com' }
      - id: release
        uses: fmmenchi/shared-platform/packages/ops/gh-actions/actions/release@gh-actions/v0.1.2
        with: { github-token: '${{ secrets.GITHUB_TOKEN }}' }
      # …then read the record it emitted — ideally from their own jobs, so each retries alone:
      - uses: fmmenchi/shared-platform/packages/ops/gh-actions/actions/attach-sbom@gh-actions/v0.1.2
        with: { result-file: '${{ steps.release.outputs.result-file }}' }
      - uses: fmmenchi/shared-platform/packages/ops/gh-actions/actions/notify@gh-actions/v0.1.2
        with: { result-file: '${{ steps.release.outputs.result-file }}' }
```

## Docs on GitHub Pages — a job you own

There is no docs reusable workflow either, and for a different reason than the release one: it
carried no `@fmmenchi` logic at all. `checkout`, `setup`, an `nx run`, a `cp`, and GitHub's own
`*-pages` actions — boilerplate you can read, hidden behind a tag you had to pin.

The part worth sharing was never the YAML: **Pages allows exactly one deployment per repository**, so
a docs site and a Storybook cannot be two workflows — the second silently replaces the first. The
whole job, with that warning, is in
[deploy a docs site](./docs/guides/deploy-a-docs-site.md).

## Building blocks (composite actions)

Weave these into your own jobs when the turnkey workflow isn't enough. Run `setup` first — the others
shell out to nx.

| Action                                                                             | Does                                                                                                     |
| ---------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `fmmenchi/shared-platform/packages/ops/gh-actions/actions/setup@gh-actions/v0.1.2` | pnpm + Node + frozen install (`registry-url` input for publishing jobs)                                  |
| `.../gh-actions/actions/trivy-scan@gh-actions/v0.1.2`                              | vuln + secret scan via `@fmmenchi/nx-trivy`, per-day DB cache                                            |
| `.../gh-actions/actions/attach-sbom@gh-actions/v0.1.2`                             | one CycloneDX SBOM per released project (`result-file`) → uploaded to each Release as `sbom.cdx.json`    |
| `.../gh-actions/actions/release@gh-actions/v0.1.2`                                 | run `nx release` and emit the record of what it released (`result-file`, `released`)                     |
| `.../gh-actions/actions/notify@gh-actions/v0.1.2`                                  | announce every release in a record, or one event; RED when a message it was asked to send did not arrive |

## Versioning

This is a real nx library (`@fmmenchi/gh-actions`, `scope:ops`, `private` — versioned but not
published to npm). `nx release` versions and tags it **automatically** from conventional commits
(`feat(gh-actions)` / `fix(gh-actions)`), in its own release group — exactly like the `@fmmenchi/*`
packages, no hand-tagging. Its tags are `uses`-safe (slash-scoped, so no `@` clash):

**Pin the exact tag** — `@gh-actions/v0.1.2` — or a full commit SHA if you want the strongest
freeze. **No tag is ever moved**, so what you pinned is what runs, permanently.

Dependabot is what keeps you current: this repo's `github-actions` ecosystem opens a PR when a new
version exists, so an update is something you read and merge rather than something that happens to
you. That trade is the point. A moving tag hands the decision of _when the code you run changes_ to
whoever can move it — which is how `tj-actions/changed-files` compromised 20k repositories in March
2025, by rewriting existing version tags to a malicious commit rather than publishing anything new.

(The `gh-actions/v0` tag from the moving-alias era is being deleted; never pin a tag that can move.)

(The `@fmmenchi/*` package tags — `@fmmenchi/notify@0.0.4` — can't be reused here: a leading `@` in a
`uses:` ref clashes with the `path@ref` delimiter. Same semver spirit, `uses`-safe spelling.)

shared-platform **dogfoods** these: its own `security.yml` and the `ci.yml` release job consume the
same bricks via a local `./packages/ops/gh-actions/actions/...` reference, so what's exported is what's run.
