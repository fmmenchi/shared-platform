import type { PromiseExecutor } from '@nx/devkit';
import type { ErrorExecutorSchema } from './schema';

/**
 * Sends an error/alert to Slack with a link back to whatever produced it.
 *
 * Same contract as the release executor: secrets from the environment (never options, so
 * a token never lands in the project graph), and a missing config short-circuits to
 * success rather than failing a job over a notification that was never set up. The
 * message and run URL fall back to `ERROR_MESSAGE` / `ERROR_URL`.
 */
const runExecutor: PromiseExecutor<ErrorExecutorSchema> = async (
  options,
  context,
) => {
  const token = process.env['SLACK_BOT_TOKEN'];
  const channel = process.env['SLACK_CHANNEL_ID'];

  if (!token || !channel) {
    console.log(
      'SLACK_BOT_TOKEN or SLACK_CHANNEL_ID is not set — skipping the notification.',
    );
    return { success: true };
  }

  /* appName defaults to the project the target runs on — the common case in CI. */
  const appName = options.appName ?? context.projectName ?? '';

  const message = options.message ?? process.env['ERROR_MESSAGE'] ?? '';
  if (!message) {
    console.log('No error message — nothing to send.');
    return { success: true };
  }

  const url = options.url ?? process.env['ERROR_URL'] ?? '';

  /* Dynamic import: this executor is CommonJS and the notify library is ESM. */
  const { notify, slack, errorNotification } = await import('@fmmenchi/notify');

  try {
    await notify(
      slack({ token, channel }),
      errorNotification(appName, message, url),
    );

    console.log(`Sent an alert for ${appName} to Slack.`);
    return { success: true };
  } catch (error) {
    console.error(String(error));
    return { success: false };
  }
};

export default runExecutor;
