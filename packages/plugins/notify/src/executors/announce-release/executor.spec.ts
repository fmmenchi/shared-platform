import type { ExecutorContext } from '@nx/devkit';

import type { ReleaseExecutorSchema } from './schema';
import executor from './executor';

const context = {
  root: '',
  cwd: process.cwd(),
  isVerbose: false,
} as ExecutorContext;

const options: ReleaseExecutorSchema = { appName: 'dev-blog' };

describe('release executor', () => {
  const saved = { ...process.env };
  afterEach(() => {
    process.env = { ...saved };
  });

  it('skips green when the Slack secrets are absent — a fork must not go red', async () => {
    delete process.env['SLACK_BOT_TOKEN'];
    delete process.env['SLACK_CHANNEL_ID'];

    const output = await executor(options, context);

    expect(output.success).toBe(true);
  });

  it('skips green when there is no version — a push that cut no tag has nothing to say', async () => {
    process.env['SLACK_BOT_TOKEN'] = 'xoxb-test';
    process.env['SLACK_CHANNEL_ID'] = 'C0123';
    delete process.env['RELEASE_VERSION'];

    const output = await executor({ appName: 'dev-blog' }, context);

    expect(output.success).toBe(true);
  });
});
