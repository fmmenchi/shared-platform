---
title: '@fmmenchi/nx-notify'
---

# @fmmenchi/nx-notify

Nx **executors that fire notifications from CI**, wrapping the
[@fmmenchi/notify](../../libraries/notify/index.md) brick. Two events today — `announce-release` and
`announce-error` — and room for more.
Secrets come from the environment (never options, so a token never lands in the project graph);
missing config skips green.

## Install

```bash
pnpm add -D @fmmenchi/nx-notify @fmmenchi/notify
```

## Usage

```jsonc
// a target on the consuming project — appName defaults to the project
"announce-release": {
  "executor": "@fmmenchi/nx-notify:announce-release"
}
```

```bash
# CI passes the secrets + the release facts as env / options:
SLACK_BOT_TOKEN=… SLACK_CHANNEL_ID=… \
RELEASE_VERSION=1.2.0 RELEASE_URL=… RELEASE_FROM=<sha> RELEASE_TO=<sha> \
  pnpm nx run myapp:announce-release
```

The `announce-release` executor collects the commits in `from..to` via `git log`, builds a
Wishew-style changelog and announces it; pass a pre-rendered `body` (e.g. a GitHub Release body) to
use that verbatim instead. The `announce-error` executor sends an alert with a link back to the run.

| Input                                  | From                                                    |
| -------------------------------------- | ------------------------------------------------------- |
| `SLACK_BOT_TOKEN` / `SLACK_CHANNEL_ID` | **env** (absent → skips)                                |
| `appName`                              | option                                                  |
| `version` / `url`                      | option / `RELEASE_VERSION` · `RELEASE_URL`              |
| `from` / `to` / `body`                 | option / `RELEASE_FROM` · `RELEASE_TO` · `RELEASE_BODY` |

## Reference

- The notification brick it wraps: [@fmmenchi/notify](../../libraries/notify/index.md)
- Source: `packages/plugins/notify`
