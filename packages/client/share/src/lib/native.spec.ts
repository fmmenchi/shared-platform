import { afterEach, describe, it, expect, vi } from 'vitest';
import { canShareNatively, shareNatively } from './native.js';

const content = { url: 'https://example.com/a', title: 'A' };

/** What a browser throws: a DOMException, told apart by its `name`. */
const domError = (name: string) => new DOMException('', name);

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('canShareNatively', () => {
  it('is false on a server, where there is no navigator', () => {
    vi.stubGlobal('navigator', undefined);

    expect(canShareNatively()).toBe(false);
  });

  it('is false in a browser without the sheet', () => {
    vi.stubGlobal('navigator', {});

    expect(canShareNatively()).toBe(false);
  });

  it('is true where the browser has one', () => {
    vi.stubGlobal('navigator', { share: vi.fn() });

    expect(canShareNatively()).toBe(true);
  });

  it('asks the browser about the content, when given some', () => {
    const canShare = vi.fn().mockReturnValue(false);
    vi.stubGlobal('navigator', { share: vi.fn(), canShare });

    expect(canShareNatively(content)).toBe(false);
    expect(canShare).toHaveBeenCalledWith(content);
    // Without content there is nothing to ask about.
    expect(canShareNatively()).toBe(true);
  });

  it('takes the sheet at its word where it cannot be asked', () => {
    vi.stubGlobal('navigator', { share: vi.fn() });

    expect(canShareNatively(content)).toBe(true);
  });
});

describe('shareNatively', () => {
  it('hands the content to the sheet', async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { share });

    await expect(shareNatively(content)).resolves.toBe('shared');
    expect(share).toHaveBeenCalledWith(content);
  });

  it('reports a closed sheet as cancelled, not as a failure', async () => {
    const share = vi.fn().mockRejectedValue(domError('AbortError'));
    vi.stubGlobal('navigator', { share });

    await expect(shareNatively(content)).resolves.toBe('cancelled');
  });

  it('reports everything else as failed, instead of swallowing it', async () => {
    // No user gesture, or content the sheet will not take. Both used to vanish
    // into the same empty catch as a dismissal.
    const share = vi
      .fn()
      .mockRejectedValueOnce(domError('NotAllowedError'))
      .mockRejectedValueOnce(new TypeError('bad data'));
    vi.stubGlobal('navigator', { share });

    await expect(shareNatively(content)).resolves.toBe('failed');
    await expect(shareNatively(content)).resolves.toBe('failed');
  });

  it('is unavailable, without throwing, where there is no sheet', async () => {
    vi.stubGlobal('navigator', {});

    await expect(shareNatively(content)).resolves.toBe('unavailable');
  });
});
