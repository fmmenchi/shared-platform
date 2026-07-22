// Announces one published release to Slack, using the @fmmenchi/notify brick. Fed by env
// (RELEASE_TAG / RELEASE_URL / RELEASE_BODY + SLACK_BOT_TOKEN / SLACK_CHANNEL_ID). The
// CALLER (the release job, or the manual workflow_dispatch) loops over the newly cut tags
// and sets these. Missing Slack secrets skip green; a Slack refusal fails loudly.
import { notify, releaseNotification, slack } from '@fmmenchi/notify';

const token = process.env['SLACK_BOT_TOKEN'];
const channel = process.env['SLACK_CHANNEL_ID'];
if (!token || !channel) {
  console.log('SLACK_BOT_TOKEN or SLACK_CHANNEL_ID is not set — skipping.');
  process.exit(0);
}

const tag = process.env['RELEASE_TAG'] ?? '';
const url = process.env['RELEASE_URL'] ?? '';
const body = process.env['RELEASE_BODY'] ?? '';

// Independent tags are `{projectName}@{version}` and the name is scoped
// (`@fmmenchi/notify@0.0.2`) — split on the LAST '@'.
const at = tag.lastIndexOf('@');
const appName = at > 0 ? tag.slice(0, at) : tag;
const version = at > 0 ? tag.slice(at + 1) : '';
if (!version) {
  console.log(`Release tag "${tag}" has no version — skipping.`);
  process.exit(0);
}

try {
  await notify(
    slack({ token, channel }),
    releaseNotification(appName, version, url, body ? { body } : undefined),
  );
  console.log(`Announced ${appName} v${version} to Slack.`);
} catch (error) {
  console.error(String(error));
  process.exit(1);
}
