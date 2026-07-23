---
title: Concepts
sidebar_label: 🏗 Concepts
sidebar_position: 3
---

# Core Concepts

Why `@fmmenchi/nx-notify` is shaped the way it is, and how it works inside.

---

## 💡 The Philosophy

The plugin exists so a CI job can announce a release or raise an alert on Slack with a plain Nx
target — `nx run <project>:announce-release` — instead of hand-rolled `curl` and `jq`. Three
principles keep it honest.

### 1. Secrets from the environment, never options

`SLACK_BOT_TOKEN` and `SLACK_CHANNEL_ID` are read from `process.env`, never from executor options.
An option ends up in the project graph and in `nx show project` output, and a bot token must not.
Only the event data — version, url, changelog range, message — is passed as options, and even those
fall back to `RELEASE_*` / `ERROR_*` env vars for the values a job only knows at runtime.

### 2. Skip = success

Two states short-circuit to `{ success: true }`, and neither is a failure:

- **The secrets are absent** — a fork, or anyone who never wired Slack, must not go red over a
  notification they were never set up to send.
- **There is nothing to announce** — an empty `version` (release step ran but cut no tag) or an
  empty `message` means the executor logs why and returns success.

A notification is a side effect of a green pipeline, not a gate on it.

### 3. Formatting lives in the brick, not here

The message blocks are built and sent by `@fmmenchi/notify` — tested TypeScript, not `curl` and
`jq`. The failure that actually happens is Slack answering `200` while refusing the message, and
only a unit test in the brick pins that down. This plugin tests only what it owns: the git
changelog parsing and the skip-paths.

---

## 🏗 How It Works Inside

### The two executors

- **`announce-release`** resolves `appName` (defaulting to the project the target runs on), then
  the version, url, and changelog. A pre-rendered `body` wins verbatim; otherwise, given a
  `from`/`to` range, it collects commits with `git log` and builds a Wishew-style changelog. It then
  calls `notify(slack(...), releaseNotification(...))`.
- **`announce-error`** follows the same contract with `message` / `url` in place of the release
  facts, calling `notify(slack(...), errorNotification(...))`.

### The changelog shim

`src/lib/git.ts` splits into two pieces on purpose:

- **`parseCommits`** — pure, tab-delimited (`%h%x09%s`) parsing of `git log` output, unit-tested
  without spawning git so subjects containing spaces or arrows survive intact.
- **`collectCommits`** — the thin `git log from..to` shim. `includeMerges` defaults to true because
  a squash-merge trunk shows PR merge commits as the meaningful history; turn it off for a
  rebase-merge repo where merges are noise. A missing range is caught and the announcement is sent
  without the log rather than sunk.

### CommonJS plugin, ESM brick

The plugin is CommonJS (Nx loads executors with `require`), and `@fmmenchi/notify` is ESM. The
executors bridge that gap with a dynamic `await import('@fmmenchi/notify')` at the point of use —
the same pattern the workspace uses elsewhere to reach an ESM package from a CommonJS plugin.

### Dogfooding in this workspace

`shared-platform` runs its own plugin. The CI release job announces one message per newly cut tag
(`announce-release`, feeding each GitHub Release body in as `RELEASE_BODY`), and the weekly security
workflow raises an alert on findings (`announce-error`). Both pass the Slack secrets as env and skip
green when they are absent.
