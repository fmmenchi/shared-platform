# AGENTS.md — @fmmenchi/notify

The notification **brick**: a channel client + message builders, callable from anywhere (app,
server, Worker, a CI step). Part of `shared-platform`; workspace contract in
[../../../AGENTS.md](../../../AGENTS.md). Scope `shared`, type `util`.

## Commands

```bash
pnpm nx typecheck @fmmenchi/notify
pnpm nx build @fmmenchi/notify
pnpm nx lint @fmmenchi/notify
pnpm nx test @fmmenchi/notify    # node vitest, fetch stubbed via vi.stubGlobal
```

## Shape

- `postToSlack({ token, channel, text, blocks })` — the reason this is TS, not `curl`: **Slack
  answers HTTP 200 even when it refuses the message** (`{ ok: false, error }`). It parses the body
  and **throws** on refusal (`invalid_auth`, `not_in_channel`, …). Only a unit test pins that down.
- `releaseBlocks(appName, version, url, changelog?)` — release announcement. `version` is the bare
  tag (no `v`; the heading adds it). `changelog` optional → omit for a thin message.
- `errorBlocks(appName, message, url)` — an alert with a "See the run" button.
- `formatChangelog({ fromRef, toRef, commits })` — the pure mrkdwn changelog: `from → to` + one
  bullet per commit, **capped** at 15 with an explicit `+N more` (never a silent cut).

## Rules

- **Pure — no git, no `child_process`, no side effects** beyond `fetch` in `postToSlack`. It
  receives already-collected commits, which is what makes it a reusable brick. Commit collection
  (git) lives in the consumer, e.g. `@fmmenchi/nx-notify`.
- `text` is never optional even with blocks: it is the phone-notification / screen-reader fallback.
- `appName` is a parameter, never hardcoded — one channel can carry many projects.

`CLAUDE.md` is a symlink to this file — edit `AGENTS.md` only.
