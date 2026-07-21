import type { ExecutorContext } from '@nx/devkit';

import type { ErrorExecutorSchema } from './schema';
import executor from './executor';

const context = {
  root: '',
  cwd: process.cwd(),
  isVerbose: false,
} as ExecutorContext;

const options: ErrorExecutorSchema = { appName: 'dev-blog' };

describe('error executor', () => {
  const saved = { ...process.env };
  afterEach(() => {
    process.env = { ...saved };
  });

  it('skips green when the Slack secrets are absent', async () => {
    delete process.env['SLACK_BOT_TOKEN'];
    delete process.env['SLACK_CHANNEL_ID'];

    const output = await executor(options, context);

    expect(output.success).toBe(true);
  });

  it('skips green when there is no message', async () => {
    process.env['SLACK_BOT_TOKEN'] = 'xoxb-test';
    process.env['SLACK_CHANNEL_ID'] = 'C0123';
    delete process.env['ERROR_MESSAGE'];

    const output = await executor({ appName: 'dev-blog' }, context);

    expect(output.success).toBe(true);
  });
});
