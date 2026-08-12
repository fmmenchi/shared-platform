/** The parts of an `<img>` this question needs — so it can be asked of a fake. */
export interface ImageLoadState {
  complete: boolean;
  naturalWidth: number;
  decode: () => Promise<unknown>;
}

/**
 * Is this image genuinely broken, or only suspicious?
 *
 * `onError` alone misses the failures React never sees: an error that fired
 * before hydration attached the handler, and a cached failure the browser
 * resolves without re-firing the event. A COMPLETE image with no pixels is the
 * DOM's record of both — but only a SUSPICION: a loaded SVG with a bare
 * `viewBox` also reports `naturalWidth: 0` (per spec; Firefox does exactly
 * that), and condemning it would swap a healthy image for initials forever.
 * `decode()` settles it, rejecting only for an image that truly cannot render.
 *
 * IT TAKES A SHAPE, NOT AN ELEMENT, and that is the point of the file. Written
 * inline in the component the decision could not be proved: Chromium — the
 * suite's only engine — reports `naturalWidth: 150` for a dimensionless SVG
 * and resolves its `decode()`, so the false suspicion this guard absorbs never
 * arises there. Measured. Deleting the confirmation and condemning on
 * suspicion alone left every test green and broke Firefox only. Asked of a
 * plain object, all three answers are provable anywhere.
 */
export async function isImageBroken(img: ImageLoadState): Promise<boolean> {
  // Still loading, or it has pixels: nothing to suspect.
  if (!img.complete || img.naturalWidth !== 0) return false;
  try {
    await img.decode();
    // Decoded: the dimensionless SVG, not a broken image.
    return false;
  } catch {
    return true;
  }
}
