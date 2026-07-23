# AGENTS.md — @fmmenchi/nx-notify

Nx plugin: executors that fire Slack notifications from CI, wrapping the `@fmmenchi/notify` brick.
Part of `shared-platform`; workspace contract in [../../../AGENTS.md](../../../AGENTS.md). Scope
`plugins`, type `plugin`. Human docs (concepts/guides/reference) live in [`./docs`](./docs) — read
them for the long-form rationale; keep this file terse and accurate to the source.

## Commands

```bash
pnpm nx typecheck @fmmenchi/nx-notify
pnpm nx build @fmmenchi/nx-notify
pnpm nx lint @fmmenchi/nx-notify
pnpm nx test @fmmenchi/nx-notify   # node vitest (git parser + executor skip-paths)
```

## Shape

- **executor `announce-release`** — announces a cut release to Slack with a changelog. Resolves
  `appName` (defaults to the project the target runs on), then builds the changelog: a `body` wins
  verbatim (git ignored), else a `from`/`to` range is collected via `collectCommits`
  (`git log from..to` in `src/lib/git.ts`). Calls `notify(slack(...), releaseNotification(...))`.
  Options `appName`, `version`, `url`, `from`, `to`, `includeMerges` (default `true`), `body`.
- **executor `announce-error`** — an alert with a link back to the run. Calls
  `notify(slack(...), errorNotification(...))`. Options `appName`, `message`, `url`.
- **`src/lib/git.ts`** — `parseCommits` (pure, tab-delimited, unit-tested) + `collectCommits` (the
  `git log` shim).
- Both executors' targets `dependsOn: ["build"]`, so Nx builds the plugin on demand.

## Rules

- **Secrets from the environment, never options** — `SLACK_BOT_TOKEN` + `SLACK_CHANNEL_ID` are read
  from `process.env`; a token in options would leak into the project graph. Event data (version,
  url, range, message, body) comes from options, falling back to `RELEASE_*` / `ERROR_*` env for the
  CI-dynamic values. See [concepts](./docs/concepts).
- **Skip = success** — missing secrets, or an empty `version`/`message`, return `{ success: true }`.
  A fork or a no-op push must not go red over a notification it was never set up to send.
- **Dynamic import of `@fmmenchi/notify`** (`await import(...)`) — this plugin is CommonJS, the brick
  is ESM. Same pattern `@fmmenchi/nx-theme-generator` uses for `@fmmenchi/tokens`.
- **Message formatting is not tested here** — it lives (and is tested) in `@fmmenchi/notify`; this
  package tests only git parsing and the skip-paths.

## Use from a consumer

```jsonc
// project.json target — appName defaults to the project, so options are optional
"announce-release": {
  "executor": "@fmmenchi/nx-notify:announce-release"
}
```

Then `nx run <project>:announce-release`, with CI passing `SLACK_BOT_TOKEN`/`SLACK_CHANNEL_ID` +
`RELEASE_VERSION`/`RELEASE_URL` and either `RELEASE_BODY` (pre-rendered notes) or
`RELEASE_FROM`/`RELEASE_TO` (a git range). shared-platform itself dogfoods this in the CI release
job, invoked per newly cut tag with `--appName` and feeding each GitHub Release body as
`RELEASE_BODY`. Full walkthrough in [guides](./docs/guides/announce-a-release.md).

`CLAUDE.md` is a symlink to this file — edit `AGENTS.md` only.
