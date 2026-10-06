import { afterEach, describe, it, expect, vi } from 'vitest';
import { copyText } from './clipboard.js';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('copyText', () => {
  it('writes the text and says so', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { clipboard: { writeText } });

    await expect(copyText('https://example.com')).resolves.toBe(true);
    expect(writeText).toHaveBeenCalledWith('https://example.com');
  });

  it('says NO when the write was refused', async () => {
    // The defect this exists to remove: a tick, and a "link copied" read out
    // by a screen reader, for a clipboard that holds nothing new.
    const writeText = vi.fn().mockRejectedValue(new Error('NotAllowedError'));
    vi.stubGlobal('navigator', { clipboard: { writeText } });

    await expect(copyText('https://example.com')).resolves.toBe(false);
  });

  it('says no where there is no clipboard: an insecure origin', async () => {
    vi.stubGlobal('navigator', {});

    await expect(copyText('https://example.com')).resolves.toBe(false);
  });

  it('says no where there is no navigator at all', async () => {
    vi.stubGlobal('navigator', undefined);

    await expect(copyText('https://example.com')).resolves.toBe(false);
  });

  it('says no on this server, unstubbed: Node has a navigator and no clipboard', async () => {
    await expect(copyText('https://example.com')).resolves.toBe(false);
  });
});
