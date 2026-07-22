# @fmmenchi/nx-notify

Nx executors that fire notifications from CI, wrapping the [`@fmmenchi/notify`](../../shared/notify)
brick. Two events today — `release` and `error` — and room for more.

## `release`

Announces a freshly cut release to Slack, with a Wishew-style changelog (the commit range plus the
commits it shipped).

```jsonc
// a target on the consuming project
"notify-release": {
  "executor": "@fmmenchi/nx-notify:release",
  "options": { "appName": "dev-blog" }
}
```

| Input              | From                          | Notes                                            |
| ------------------ | ----------------------------- | ------------------------------------------------ |
| `SLACK_BOT_TOKEN`  | **env**                       | `xoxb-…` with `chat:write`. Absent → skips.      |
| `SLACK_CHANNEL_ID` | **env**                       | `C…` (the ID). Absent → skips.                   |
| `appName`          | option                        | Shown in the message.                            |
| `version`          | option / `RELEASE_VERSION`    | Bare tag (no `v`). Empty → nothing to announce.  |
| `url`              | option / `RELEASE_URL`        | "View release" button.                           |
| `from` / `to`      | option / `RELEASE_FROM`/`_TO` | Changelog range. Absent → message without a log. |
| `includeMerges`    | option (default `true`)       | Keep merge commits in the changelog.             |

Secrets are read from the environment, never options — a token must not land in the project graph.

## `error`

An alert with a link back to the run.

```jsonc
"notify-error": {
  "executor": "@fmmenchi/nx-notify:error",
  "options": { "appName": "dev-blog" }
}
```

Inputs: `SLACK_BOT_TOKEN`/`SLACK_CHANNEL_ID` (env), `appName` (option), `message` (option /
`ERROR_MESSAGE`), `url` (option / `ERROR_URL`).

## Behaviour

Missing secrets, or an empty version/message, **exit green** — a fork or a no-op push must not fail
over a notification it was never configured to send. A Slack refusal (200-but-`ok:false`) fails
loudly, via `@fmmenchi/notify`.
