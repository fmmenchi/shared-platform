import { afterEach, describe, it, expect, vi } from 'vitest';
import { canShareNatively, shareNatively } from './native.js';

const content = { url: 'https://example.com/a', title: 'A' };

/** What a browser throws: a DOMException, told apart by its `name`. */
const domError = (name: string) => new DOMException('', name);

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('canShareNatively', () => {
  it('is false where there is no navigator at all', () => {
    vi.stubGlobal('navigator', undefined);

    expect(canShareNatively()).toBe(false);
  });

  it('is false on this server, unstubbed: Node has a navigator and no sheet', () => {
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

  it('reads the abort by its name, since the error may come from another realm', async () => {
    // An iframe's navigator rejects with an error that is no instance of this
    // realm's `Error`; `instanceof` reported that dismissal as a failure.
    const share = vi.fn().mockRejectedValue({ name: 'AbortError' });
    vi.stubGlobal('navigator', { share });

    await expect(shareNatively(content)).resolves.toBe('cancelled');
  });

  it('still opens the sheet for content the browser says it would refuse', async () => {
    // `canShare` is the caller's question to ask first. Asked here, a refusal
    // would come back as `unavailable` — "there is no sheet" — which is false.
    const share = vi.fn().mockRejectedValue(new TypeError('bad data'));
    const canShare = vi.fn().mockReturnValue(false);
    vi.stubGlobal('navigator', { share, canShare });

    await expect(shareNatively(content)).resolves.toBe('failed');
    expect(share).toHaveBeenCalledOnce();
  });

  it('hands over the three members and nothing else the object carries', async () => {
    // A `ShareData` with `files` is assignable to `ShareContent`; this package
    // does not share files and must not do so by accident.
    const share = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { share });
    const data = { ...content, text: 'Words', files: [new Blob()], secret: 1 };

    await shareNatively(data);

    expect(share).toHaveBeenCalledWith({ ...content, text: 'Words' });
  });

  it('leaves out what was not given, the url included', async () => {
    // The sheet reads `url: ''` as "the current page" — a fallback to
    // window.location by another name — and a blank title as a title.
    const share = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { share });

    await shareNatively({ url: '', title: '  ', text: 'Words' });

    expect(share).toHaveBeenCalledWith({ text: 'Words' });
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
