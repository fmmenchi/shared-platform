import type { PromiseExecutor } from '@nx/devkit';
import type { ReleaseChangelog } from '@fmmenchi/notify';
import type { ReleaseExecutorSchema } from './schema';
import { collectCommits } from '../../lib/git';

/**
 * Announces a freshly cut release to Slack, with the changelog for the range it spans.
 *
 * Secrets come from the environment, never options: an option ends up in the project
 * graph and `nx show project` output, and a token must not. Version / URL / range fall
 * back to `RELEASE_*` env vars, which are different on every run and known only to the
 * job that cut the tag.
 *
 * Two states short-circuit to success, and neither is a failure: the secrets are absent
 * (a fork must not go red over a notification it was never set up to send), or there is
 * no version (the release step ran but cut no tag).
 *
 * The message itself is built and sent by `@fmmenchi/notify` — tested TypeScript, not
 * curl and jq — because the failure that actually happens is Slack answering 200 while
 * refusing the message, and only a unit test pins that down.
 */
const runExecutor: PromiseExecutor<ReleaseExecutorSchema> = async (options) => {
  const token = process.env['SLACK_BOT_TOKEN'];
  const channel = process.env['SLACK_CHANNEL_ID'];

  if (!token || !channel) {
    console.log(
      'SLACK_BOT_TOKEN or SLACK_CHANNEL_ID is not set — skipping the notification.',
    );
    return { success: true };
  }

  const version = options.version ?? process.env['RELEASE_VERSION'] ?? '';
  if (!version) {
    console.log('No release version — no new tag to announce.');
    return { success: true };
  }

  const url = options.url ?? process.env['RELEASE_URL'] ?? '';
  const body = options.body ?? process.env['RELEASE_BODY'];
  const from = options.from ?? process.env['RELEASE_FROM'];
  const to = options.to ?? process.env['RELEASE_TO'];

  let changelog: ReleaseChangelog | undefined;
  if (body) {
    /* Pre-rendered notes (e.g. a GitHub Release body) win over recomputing from git. */
    changelog = { body };
  } else if (from && to) {
    try {
      changelog = {
        fromRef: from,
        toRef: to,
        commits: collectCommits(from, to, options.includeMerges ?? true),
      };
    } catch (error) {
      /* A missing range must not sink the announcement — send it without the log. */
      console.warn(
        `Could not collect commits for ${from}..${to}: ${String(error)}`,
      );
    }
  }

  /* Dynamic import: this executor is CommonJS and the notify library is ESM. */
  const { notify, slack, releaseNotification } = await import('@fmmenchi/notify');

  try {
    await notify(
      slack({ token, channel }),
      releaseNotification(options.appName, version, url, changelog),
    );

    console.log(`Announced ${options.appName} v${version} to Slack.`);
    return { success: true };
  } catch (error) {
    /* A notification that silently did not arrive is worse than one that failed loudly. */
    console.error(String(error));
    return { success: false };
  }
};

export default runExecutor;
