# @fmmenchi/notify

A small, **channel-agnostic** notification brick. You build a neutral notification once and hand it
to one or more **transports** — Slack today, email/webhook tomorrow (a new transport, not a new
package). No framework, no Nx: call it from an app, a Worker, or a CI step.

```ts
import { notify, slack, releaseNotification } from '@fmmenchi/notify';

const channel = slack({
  token: process.env.SLACK_BOT_TOKEN!, // xoxb-… with chat:write
  channel: process.env.SLACK_CHANNEL_ID!, // C… (the ID, not the name)
});

await notify(
  channel,
  releaseNotification('myapp', '1.2.0', 'https://github.com/…/releases/tag/v1.2.0', {
    fromRef: 'e99cade',
    toRef: '7a831c7',
    commits: [{ sha: '565fee8', subject: 'fix: …' }],
  }),
);

// One notification, many channels — the point of the abstraction:
// await notify([slack(cfg), email(cfg)], errorNotification('myapp', 'deploy failed', runUrl));
```

## The seam: neutral notification → transport

A `Notification` (`kind`, `text`, `title`, `body`, `actions`) carries **no** channel schema — the
Slack transport renders it into Block Kit and converts the markdown body to mrkdwn; another transport
would render it its own way. Adding a channel means implementing `Transport.send`, nothing else.

## Why a transport, not `curl`

Slack answers **HTTP 200 even when it rejects the message** — a bad token, an uninvited channel, a
malformed block all come back `200` with `{ "ok": false }`. The Slack transport parses the body and
throws with the error code, so a caller can't report success and deliver nothing. That is the one
behaviour a shell script can't guarantee and a unit test can.

## API

| Export                                             | Purpose                                                       |
| -------------------------------------------------- | ------------------------------------------------------------- |
| `notify(transport \| transport[], notification)`   | Fan a notification out to one or many transports.             |
| `slack({ token, channel })`                        | The Slack `Transport`. Throws on transport error or `ok:false`. |
| `releaseNotification(appName, version, url, changelog?)` | Neutral release notification; `version` is bare (no `v`). |
| `errorNotification(appName, message, url)`         | Neutral error alert.                                          |
| `formatChangelog({fromRef, toRef, commits})`       | Markdown changelog: `from → to` + bullets, capped at 15.     |

For firing these from CI on release, see **`@fmmenchi/nx-notify`** (the Nx executors that wrap this).
