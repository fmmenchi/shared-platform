---
title: '@fmmenchi/notify'
---

# @fmmenchi/notify

**Channel-agnostic notifications.** You build a neutral notification once and hand it to one or
more **transports** — Slack today, email or webhook tomorrow (a new transport, not a new package).
The transport, not the caller, knows how to render and deliver.

## Install

```bash
pnpm add @fmmenchi/notify
```

## Usage

```ts
import { notify, slack, releaseNotification } from '@fmmenchi/notify';

const channel = slack({
  token: process.env.SLACK_BOT_TOKEN!, // xoxb-… with chat:write
  channel: process.env.SLACK_CHANNEL_ID!, // C… (the ID, not the name)
});

await notify(
  channel,
  releaseNotification(
    'myapp',
    '1.2.0',
    'https://github.com/…/releases/tag/v1.2.0',
    {
      body: '### Features\n- **auth:** passkeys', // or { fromRef, toRef, commits }
    },
  ),
);

// One notification, many channels — the point of the abstraction:
// await notify([slack(cfg), email(cfg)], errorNotification('myapp', 'deploy failed', runUrl));
```

## The seam

A `Notification` (`kind`, `text`, `title`, `body`, `actions`) carries **no** channel schema. The
Slack transport renders it into Block Kit and converts the markdown body to mrkdwn; another
transport renders it its own way. Adding a channel means implementing `Transport.send`, nothing
else. Each transport lives in its own folder under `src/lib/transports/`.

## Why a transport, not `curl`

Slack answers **HTTP 200 even when it refuses** (`{ "ok": false }`). The Slack transport parses the
body and throws with the error code, so a caller can't report success and deliver nothing — the one
behaviour a shell script can't guarantee and a unit test can.

## Reference

- Fire these from CI on release: [@fmmenchi/nx-notify](../../plugins/nx-notify/index.md)
- Source: `packages/shared/notify`
