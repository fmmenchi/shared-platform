---
title: Executors Reference
sidebar_label: Executors
sidebar_position: 1
---

# Executors Reference

Every executor in the `@fmmenchi/nx-notify` package, with its options, env fallbacks and defaults.

Across both executors, `SLACK_BOT_TOKEN` and `SLACK_CHANNEL_ID` are read from the **environment**,
never from options. If either is missing the executor logs a note and returns `{ success: true }`.

---

## `announce-release`

Announces a freshly cut release to Slack, with a changelog for the range it spans.

**Usage**

```bash
pnpm nx run <project>:announce-release [options]
```

**Options**

| Option            | Type      | Default                        | Env fallback      | Description                                                                                         |
| :---------------- | :-------- | :----------------------------- | :---------------- | :-------------------------------------------------------------------------------------------------- |
| `--appName`       | `string`  | the project the target runs on | —                 | Name shown in the message.                                                                          |
| `--version`       | `string`  | —                              | `RELEASE_VERSION` | Version without the leading `v`. Empty means nothing to announce → skips green.                     |
| `--url`           | `string`  | —                              | `RELEASE_URL`     | Link the "View release" button points at.                                                           |
| `--from`          | `string`  | —                              | `RELEASE_FROM`    | Changelog range start (sha or tag).                                                                 |
| `--to`            | `string`  | —                              | `RELEASE_TO`      | Changelog range end (sha or tag).                                                                   |
| `--includeMerges` | `boolean` | `true`                         | —                 | Include merge commits in the changelog. Turn off for a rebase-merge repo where merges are noise.    |
| `--body`          | `string`  | —                              | `RELEASE_BODY`    | Pre-rendered markdown notes. When set, used as the changelog verbatim and the git range is ignored. |

**Behaviour**

- With a `body` (or `RELEASE_BODY`), those notes are the changelog and no git access is needed.
- Otherwise, given both `from` and `to`, it runs `git log <from>..<to>` and builds a Wishew-style
  changelog. A range that cannot be collected is logged as a warning and the release is announced
  without the log.
- Skips green when the Slack secrets are absent, or when `version` is empty.

---

## `announce-error`

Sends an error/alert to Slack with a link back to whatever produced it.

**Usage**

```bash
pnpm nx run <project>:announce-error [options]
```

**Options**

| Option      | Type     | Default                        | Env fallback    | Description                                                 |
| :---------- | :------- | :----------------------------- | :-------------- | :---------------------------------------------------------- |
| `--appName` | `string` | the project the target runs on | —               | Name shown in the alert.                                    |
| `--message` | `string` | —                              | `ERROR_MESSAGE` | What went wrong. Empty means nothing to send → skips green. |
| `--url`     | `string` | —                              | `ERROR_URL`     | Link the "See the run" button points at.                    |

**Behaviour**

- Skips green when the Slack secrets are absent, or when `message` is empty.

---

## Targets and build

Both executors' targets declare `dependsOn: ["build"]`, so Nx builds the plugin on demand — no
separate build step is needed before invoking a notification target. The message itself is built and
sent by `@fmmenchi/notify`, dynamic-imported at runtime because this plugin is CommonJS and the brick
is ESM.
