# AGENTS.md — @fmmenchi/nx-notify

Nx plugin: executors that fire notifications from CI, wrapping the `@fmmenchi/notify` brick. Part of
`shared-platform`; workspace contract in [../../../AGENTS.md](../../../AGENTS.md). Scope `plugins`,
type `plugin`.

## Commands

```bash
pnpm nx typecheck @fmmenchi/nx-notify
pnpm nx build @fmmenchi/nx-notify
pnpm nx lint @fmmenchi/nx-notify
pnpm nx test @fmmenchi/nx-notify   # node vitest (git parser + executor skip-paths)
```

## Shape

- **executor `announce-release`** — announces a cut release to Slack with a changelog. Collects the
  commits for the range via `src/lib/git.ts` (`git log from..to`), then hands them to
  `releaseBlocks`. Options `appName` (defaults to the project the target runs on),
  `version`/`url`/`from`/`to`/`includeMerges`.
- **executor `announce-error`** — an alert with a link back to the run. Options `appName`
  (same default), `message`, `url`.
- **`src/lib/git.ts`** — `parseCommits` (pure, unit-tested) + `collectCommits` (the `git log` shim).

## Rules

- **Secrets from the environment, never options** (`SLACK_BOT_TOKEN`, `SLACK_CHANNEL_ID`): an option
  lands in the project graph / `nx show project`, and a token must not. Event data (version, url,
  range, message) comes from options, falling back to `RELEASE_*` / `ERROR_*` env for the
  CI-dynamic values.
- **Skip = success**: missing secrets, or an empty version/message, return `{ success: true }` — a
  fork or a no-op push must not go red over a notification it was never set up to send.
- **Dynamic import of `@fmmenchi/notify`** (`await import(...)`): this plugin is CommonJS and the
  brick is ESM — the same pattern `@fmmenchi/nx-theme-generator` uses for the ESM `@fmmenchi/tokens`.
- Message formatting is **not** tested here — it lives (and is tested) in `@fmmenchi/notify`; this
  package tests only the git parsing and the skip-paths.

## Use from a consumer

```jsonc
// project.json target — appName defaults to the project, so options are optional
"announce-release": {
  "executor": "@fmmenchi/nx-notify:announce-release"
}
```

Then `nx run <project>:announce-release`, with CI passing `SLACK_BOT_TOKEN`/`SLACK_CHANNEL_ID` +
`RELEASE_VERSION`/`RELEASE_URL`/`RELEASE_FROM`/`RELEASE_TO`. shared-platform itself dogfoods this in
the CI release job (invoked per newly cut tag with `--appName`).

`CLAUDE.md` is a symlink to this file — edit `AGENTS.md` only.
