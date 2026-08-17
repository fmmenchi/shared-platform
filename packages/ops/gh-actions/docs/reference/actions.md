---
title: Composite actions
sidebar_label: Composite actions
sidebar_position: 2
---

# Composite actions

Use any of these as a **step**
(`uses: fmmenchi/shared-platform/packages/ops/gh-actions/actions/<name>@gh-actions/v0`). Run `setup`
first — the others shell out to nx.

---

## `compute-context`

One canonical "what kind of run is this?" — pure computation, no inputs, no secrets. Run it once in
a tiny job and let downstream jobs `needs:` it instead of each re-deriving
`github.event_name`/`github.ref` conditions (the drift-prone pattern):

```yaml
jobs:
  context:
    runs-on: ubuntu-latest
    outputs:
      is-release: ${{ steps.ctx.outputs.is-release }}
    steps:
      - uses: actions/checkout@v7
      - id: ctx
        uses: fmmenchi/shared-platform/packages/ops/gh-actions/actions/compute-context@gh-actions/v0
  release:
    needs: [main, context]
    if: needs.context.outputs.is-release == 'true'
```

| Output              | Description                                                                                       |
| :------------------ | :------------------------------------------------------------------------------------------------ |
| `event`             | Normalized event kind — `pull-request` \| `push` \| `tag` \| `schedule` \| `dispatch` \| `other`. |
| `is-default-branch` | `"true"` on a push to the repository default branch.                                              |
| `is-release`        | `"true"` when the run should release (push to the default branch — the trunk trigger).            |
| `sha-short`         | First 12 characters of the commit SHA.                                                            |
| `ref-slug`          | Branch/tag name sanitized for tags/URLs (lowercase, non-alphanumerics → `-`).                     |

## `setup`

pnpm + Node + a frozen install for an nx workspace.

| Input          | Type   | Default | Description                                                |
| :------------- | :----- | :------ | :--------------------------------------------------------- |
| `node-version` | string | `24`    | Node version to set up.                                    |
| `registry-url` | string | `''`    | npm registry to configure (set only on jobs that publish). |

## `trivy-scan`

Vulnerability + secret scan via `@fmmenchi/nx-trivy` (docker runner), caching the vuln DB per day.

It names no project: it asks the graph which one owns `scan-docker` (the plugin infers the scan
targets onto your workspace root project) and **fails** when nothing does, since an unregistered
plugin would otherwise mean a green job that never scanned. The fix it prints is
`pnpm nx add @fmmenchi/nx-trivy`.

| Input         | Type    | Default | Description                                                                    |
| :------------ | :------ | :------ | :----------------------------------------------------------------------------- |
| `secret-scan` | boolean | `true`  | Also run the secret scan (built-in rules, no DB).                              |
| `cache-db`    | boolean | `true`  | Cache the vulnerability DB per day. Turn it **off** for a weekly-only cadence. |

**On `cache-db`.** The DB is ~100 MiB to download, ~70 MiB to store, and expires in about 21 hours.
Scanning on every dependency change, caching pays for itself. Scanning once a week, it cannot: the
restored copy is always stale, Trivy throws it away and downloads a fresh one, and the run still
uploads another 70 MiB for a next run that will do the same. Off, the docker runner keeps its own
named volume, which is the zero-config default.

## `release`

Run `nx release` through `@fmmenchi/ci` and emit a **record** of what it released — one
`{ project, version, tag }` per release, asked of nx rather than deduced from a git-tag diff. It
names no project and no path: the script is a bin (`pnpm exec fmmenchi-release`), so the same
command runs in a consumer and in the repo that publishes it.

| Input          | Type    | Default | Description                                                             |
| :------------- | :------ | :------ | :---------------------------------------------------------------------- |
| `dry-run`      | boolean | `false` | Rehearse: the record is stamped, and no consumable tag list is written. |
| `github-token` | string  | –       | **Required.** Tags, GitHub Releases, publishing.                        |

| Output        | Description                                                |
| :------------ | :--------------------------------------------------------- |
| `result-file` | Path to the record — what the SBOM and notify bricks read. |
| `released`    | How many projects were released (`0` when nothing was).    |
| `tags-file`   | Transitional: the released package tags, one per line.     |

**It does not gate itself.** Sequencing the release after your checks stays in your job graph —
`needs:` — because only the caller can express it.

## `attach-sbom`

For each project in the release record, generate a CycloneDX SBOM via `@fmmenchi/nx-trivy` and upload
it to that Release as `sbom.cdx.json`. The record carries the project and the version, so nothing here
cuts either out of a tag. Every project with a package.json infers the `sbom` target, so this loop —
the release record — is the entire policy about who gets one. Non-fatal per release: a generation or
upload failure is a warning, because the release is already out and failing here helps nobody.

| Input          | Type   | Default | Description                                                                  |
| :------------- | :----- | :------ | :--------------------------------------------------------------------------- |
| `result-file`  | string | `''`    | **Preferred.** The record from the `release` brick.                          |
| `tags-file`    | string | `''`    | Deprecated. One `{project}@{version}` tag per line, split by string surgery. |
| `github-token` | string | –       | **Required.** Token with `contents: write`.                                  |

## `notify`

Deliver notifications to Slack via `@fmmenchi/notify` — every release in a record, or one event you
describe here. It **fails when a message it was asked to send did not arrive** (delivered vs asked,
counted), and skips green — loudly, with a `::notice::` — when the Slack secrets are absent.

No project anywhere: an event carries its own identity (`app`), so nothing has to know which of your
projects hosts a notification target.

| Input                      | Type   | Default       | Description                                               |
| :------------------------- | :----- | :------------ | :-------------------------------------------------------- |
| `result-file`              | string | `''`          | A release record — one announcement per released project. |
| `kind`                     | string | `''`          | Single event instead: `release` or `error`.               |
| `app`                      | string | the repo name | Single event: what the message is about.                  |
| `message` / `version`      | string | `''`          | Single event: the error text, or the released version.    |
| `url`                      | string | this run      | Single event: where to read more.                         |
| `repository-url`           | string | this repo     | Base URL used to form release links.                      |
| `bot-token` / `channel-id` | string | `''`          | Slack secrets. Absent → skips green.                      |
