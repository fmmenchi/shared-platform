# AGENTS.md — @fmmenchi/notify

The notification **brick**: channel-agnostic notifications, callable from anywhere (app, server,
Worker, a CI step). A neutral `Notification` is built once and delivered by one or more
**transports** (Slack today; email/webhook are future transports, not future packages). Part of
`shared-platform`; workspace contract in [../../../AGENTS.md](../../../AGENTS.md). Scope `shared`,
type `util`.

## Commands

```bash
pnpm nx typecheck @fmmenchi/notify
pnpm nx build @fmmenchi/notify
pnpm nx lint @fmmenchi/notify
pnpm nx test @fmmenchi/notify    # node vitest, fetch stubbed via vi.stubGlobal
```

## Shape

Three layers — build a neutral notification, pick transport(s), send:

- **`notify(transport | transport[], notification)`** — the facade. Fans out concurrently; if any
  transport throws it rejects (silence is worse than a loud failure).
- **`Notification`** (neutral) + builders `releaseNotification(appName, version, url, changelog?)`
  and `errorNotification(appName, message, url)`. `version` is the bare tag (no `v`; the title adds
  it). `body` is plain markdown; transports convert it. `formatChangelog({ fromRef, toRef, commits })`
  → markdown changelog, **capped** at 15 commits with an explicit `+N more` (never a silent cut).
- **`Transport`** interface + **`slack({ token, channel })`** — the first/only transport today. Its
  internals (`slackBlocks`, `toMrkdwn`, the `fetch`) are Slack-specific and live behind it. The
  reason it is TS, not `curl`: **Slack answers HTTP 200 even when it refuses** (`{ ok: false }`) — it
  parses the body and **throws** (`invalid_auth`, `not_in_channel`, …); only a unit test pins that down.

## Rules

- **Adding a channel = a new `Transport`, not a new package** (`email(...)`, `webhook(...)`). Each
  transport implementation lives in its **own folder** under `lib/transports/<name>/` (Slack is
  `lib/transports/slack/`); the core (`notification`, `transport.types`, `notify`) stays channel-free.
  The neutral `Notification` is the seam; keep channel formatting inside its transport.
- **Pure — no git, no `child_process`, no side effects** beyond `fetch` inside a transport. Builders
  receive already-collected commits, which is what makes it a reusable brick. Commit collection
  (git) lives in the consumer, e.g. `@fmmenchi/nx-notify`.
- `text` is never optional: it is the phone-notification / screen-reader fallback.
- `appName` is a parameter, never hardcoded — one channel can carry many projects.
- **Types in `*.types.ts`** (`notification.types.ts`, `transport.types.ts`, `slack.types.ts`),
  never inline.

`CLAUDE.md` is a symlink to this file — edit `AGENTS.md` only.
