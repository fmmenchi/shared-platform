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

| Input         | Type    | Default | Description                                       |
| :------------ | :------ | :------ | :------------------------------------------------ |
| `secret-scan` | boolean | `true`  | Also run the secret scan (built-in rules, no DB). |

## `attach-sbom`

For each `{project}@{version}` tag in `tags-file`, generate a CycloneDX SBOM via `@fmmenchi/nx-trivy`
and upload it to that Release as `sbom.cdx.json`. Non-fatal per tag: an SBOM is opt-in per project
(`nx g @fmmenchi/nx-trivy:sbom <project>`), so a released package without the target is reported as a
warning naming that command, not a failure — the release is already out.

| Input          | Type   | Default | Description                                                 |
| :------------- | :----- | :------ | :---------------------------------------------------------- |
| `tags-file`    | string | –       | **Required.** File with one `{project}@{version}` per line. |
| `github-token` | string | –       | **Required.** Token with `contents: write`.                 |

## `announce-releases`

Announce every package in `tags-file` to Slack via `@fmmenchi/nx-notify` (the Release notes become
the changelog). Skips green without Slack secrets.

| Input          | Type   | Default | Description                                       |
| :------------- | :----- | :------ | :------------------------------------------------ |
| `tags-file`    | string | –       | **Required.** One `{project}@{version}` per line. |
| `bot-token`    | string | `''`    | Slack bot token (`SLACK_BOT_TOKEN`).              |
| `channel-id`   | string | `''`    | Slack channel id (`SLACK_CHANNEL_ID`).            |
| `github-token` | string | –       | **Required.** Reads each Release's notes/url.     |

## `slack-notify`

Announce one release or error to Slack via `@fmmenchi/nx-notify`. Skips green without Slack secrets.

| Input                              | Type   | Default | Description                                                                        |
| :--------------------------------- | :----- | :------ | :--------------------------------------------------------------------------------- |
| `type`                             | string | –       | **Required.** `release` or `error`.                                                |
| `app-name`                         | string | –       | **Required.** The name the message is about.                                       |
| `project`                          | string | –       | **Required.** A publishable nx project whose inferred `announce-*` target runs it. |
| `bot-token` / `channel-id`         | string | `''`    | Slack secrets.                                                                     |
| `message` / `url`                  | string | `''`    | `error` mode: body + a link to the run.                                            |
| `version` / `release-url` / `body` | string | `''`    | `release` mode: version, Release URL, changelog body.                              |
