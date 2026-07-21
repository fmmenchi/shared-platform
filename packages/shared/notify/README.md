# @fmmenchi/notify

A small, reusable notification brick: a Slack client that fails loudly when Slack refuses, plus the
message builders for releases and error alerts. No framework, no Nx — call it from an app, a Worker,
or a CI step.

```ts
import { postToSlack, releaseBlocks } from '@fmmenchi/notify';

await postToSlack({
  token: process.env.SLACK_BOT_TOKEN!, // xoxb-… with chat:write
  channel: process.env.SLACK_CHANNEL_ID!, // C… (the ID, not the name)
  text: `myapp v1.2.0 released`, // phone-notification fallback — required
  blocks: releaseBlocks('myapp', '1.2.0', 'https://github.com/…/releases/tag/v1.2.0', {
    fromRef: 'e99cade',
    toRef: '7a831c7',
    commits: [{ sha: '565fee8', subject: 'fix: …' }],
  }),
});
```

## Why a library, not `curl`

Slack answers **HTTP 200 even when it rejects the message** — a bad token, an uninvited channel, a
malformed block all come back `200` with `{ "ok": false }`. `postToSlack` parses the body and
throws with the Slack error code, so a caller can't report success and deliver nothing. That is the
one behaviour a shell script can't guarantee and a unit test can.

## API

| Export                                             | Purpose                                                        |
| -------------------------------------------------- | ------------------------------------------------------------- |
| `postToSlack({token, channel, text, blocks?})`     | POST to `chat.postMessage`; throws on transport or `ok:false`. |
| `releaseBlocks(appName, version, url, changelog?)` | Release announcement; `version` is bare (no `v`).             |
| `errorBlocks(appName, message, url)`               | Error alert with a "See the run" button.                      |
| `formatChangelog({fromRef, toRef, commits})`       | `from → to` + bullets, capped at 15 with `+N more`.           |

For firing these from CI on release, see **`@fmmenchi/nx-notify`** (the Nx executors that wrap this).
