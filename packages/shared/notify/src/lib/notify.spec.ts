import { notify } from './notify.js';
import { releaseNotification } from './notification.js';
import type { Transport } from './transport.types.js';

const n = releaseNotification('app', '1.0.0', 'https://x');

describe('notify', () => {
  it('sends to a single transport', async () => {
    const send = vi.fn().mockResolvedValue(undefined);
    await notify({ send } as Transport, n);
    expect(send).toHaveBeenCalledWith(n);
  });

  it('fans out to every transport (Slack AND mail AND …)', async () => {
    const a = vi.fn().mockResolvedValue(undefined);
    const b = vi.fn().mockResolvedValue(undefined);
    await notify([{ send: a }, { send: b }] as Transport[], n);
    expect(a).toHaveBeenCalledWith(n);
    expect(b).toHaveBeenCalledWith(n);
  });

  it('rejects loudly if any transport fails — silence is worse', async () => {
    const ok = vi.fn().mockResolvedValue(undefined);
    const bad = vi.fn().mockRejectedValue(new Error('down'));
    await expect(
      notify([{ send: ok }, { send: bad }] as Transport[], n),
    ).rejects.toThrow(/down/);
  });
});
