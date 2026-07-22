// Announces a published GitHub Release to Slack, one message per package, using the
// @fmmenchi/notify brick. Fed by the `release: published` event payload through env.
//
// Missing Slack secrets skip green (a fork, or a checkout before the app existed, must
// not go red over a notification it was never set up to send). A Slack refusal fails
// loudly — that is the whole reason @fmmenchi/notify exists.
// Relative to the built brick (the workflow runs `nx build @fmmenchi/notify` first).
// A bare specifier wouldn't resolve: this script is not a workspace package, so
// @fmmenchi/notify is not in a node_modules on its resolution path.
import {
  postToSlack,
  releaseBlocks,
} from '../../packages/shared/notify/dist/index.js';

const token = process.env.SLACK_BOT_TOKEN;
const channel = process.env.SLACK_CHANNEL_ID;
if (!token || !channel) {
  console.log('SLACK_BOT_TOKEN or SLACK_CHANNEL_ID is not set — skipping.');
  process.exit(0);
}

const tag = process.env.RELEASE_TAG ?? '';
const url = process.env.RELEASE_URL ?? '';
const body = process.env.RELEASE_BODY ?? '';

// Independent release tags are `{projectName}@{version}`, and the project name is itself
// scoped (`@fmmenchi/notify@0.0.2`) — so split on the LAST '@'.
const at = tag.lastIndexOf('@');
const appName = at > 0 ? tag.slice(0, at) : tag;
const version = at > 0 ? tag.slice(at + 1) : '';
if (!version) {
  console.log(`Release tag "${tag}" has no version — skipping.`);
  process.exit(0);
}

try {
  await postToSlack({
    token,
    channel,
    // Fallback text — what the phone notification shows.
    text: `${appName} v${version} released`,
    blocks: releaseBlocks(appName, version, url, body ? { body } : undefined),
  });
  console.log(`Announced ${appName} v${version} to Slack.`);
} catch (error) {
  console.error(String(error));
  process.exit(1);
}
