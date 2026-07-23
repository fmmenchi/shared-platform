---
title: '@fmmenchi/nx-notify'
sidebar_label: Notify
sidebar_position: 0
---

# @fmmenchi/nx-notify

Nx executors that fire Slack notifications from CI — a freshly cut release with its changelog, or
an error alert — wrapping the `@fmmenchi/notify` brick.

## Prerequisites

- An existing **Nx workspace**. This plugin ships two executors and no generators.
- **`@fmmenchi/notify`** installed alongside it — the plugin dynamic-imports this ESM brick to
  build and send the Slack message.
- A **Slack bot token and channel id** in the environment as `SLACK_BOT_TOKEN` and
  `SLACK_CHANNEL_ID`. They never travel as options; a missing pair skips green.
- **git** on the runner for `announce-release`'s changelog range (`from..to` via `git log`) — not
  needed when you pass a pre-rendered `body`.

## 🚀 Guides

- [Announce a release](./guides/announce-a-release) — wire `announce-release` into a release job
  and send a changelog to Slack.
- [Announce an error](./guides/announce-an-error) — fire `announce-error` as a CI alert with a link
  back to the run.

## 📚 Reference

- [Executors](./reference/executors) — every option of `announce-release` and `announce-error`,
  their env fallbacks, and defaults.

## 🏗 Concepts

- [Concepts](./concepts) — why secrets stay out of options, why a missing config skips green, and
  how a CommonJS plugin sends through an ESM brick.
