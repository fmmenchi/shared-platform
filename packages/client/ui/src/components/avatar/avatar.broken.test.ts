import { describe, it, expect } from 'vitest';
import { isImageBroken } from './avatar.broken.js';

/**
 * The three answers, asked of a plain object — which is the whole reason the
 * predicate takes a shape. In a browser only one of them is reachable:
 * Chromium reports `naturalWidth: 150` for a dimensionless SVG and resolves
 * its `decode()`, so the false suspicion the confirmation exists to absorb
 * cannot be produced there, and the guard could be deleted with the suite
 * staying green.
 */
const rejects = () => Promise.reject(new Error('broken'));
const resolves = () => Promise.resolve();

describe('isImageBroken', () => {
  it('condemns a complete image with no pixels whose decode rejects', async () => {
    await expect(
      isImageBroken({ complete: true, naturalWidth: 0, decode: rejects }),
    ).resolves.toBe(true);
  });

  it('spares the dimensionless SVG, which is the false suspicion', async () => {
    // A loaded SVG with a bare `viewBox` reports `naturalWidth: 0` per spec —
    // Firefox does exactly that — and condemning it swaps a healthy image for
    // initials forever.
    await expect(
      isImageBroken({ complete: true, naturalWidth: 0, decode: resolves }),
    ).resolves.toBe(false);
  });

  it('suspects nothing while the image is still loading', async () => {
    await expect(
      isImageBroken({
        complete: false,
        naturalWidth: 0,
        decode: rejects,
      }),
    ).resolves.toBe(false);
  });

  it('suspects nothing when the image has pixels', async () => {
    await expect(
      isImageBroken({ complete: true, naturalWidth: 96, decode: rejects }),
    ).resolves.toBe(false);
  });
});
