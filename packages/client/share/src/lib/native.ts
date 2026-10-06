import type { NativeShareOutcome, ShareContent } from './share.types.js';

/**
 * Whether the browser has a share sheet — and, given the content, whether it
 * would take it. `false` on a server, so the answer differs between the two
 * renders: ask after mount, never during one.
 *
 * WHEN to prefer the sheet over a list of channels (touch only? always?) is
 * the app's policy and is not answered here.
 */
export function canShareNatively(content?: ShareContent): boolean {
  if (
    typeof navigator === 'undefined' ||
    typeof navigator.share !== 'function'
  ) {
    return false;
  }
  if (content === undefined || typeof navigator.canShare !== 'function') {
    return true;
  }
  return navigator.canShare(content);
}

/**
 * Open the native share sheet. Never rejects: the reader closing the sheet is
 * `cancelled`, and only what is left over is `failed`. Call it from a click —
 * without a user gesture the browser refuses, and that is a `failed`.
 */
export async function shareNatively(
  content: ShareContent,
): Promise<NativeShareOutcome> {
  if (!canShareNatively()) return 'unavailable';
  try {
    await navigator.share(content);
    return 'shared';
  } catch (error) {
    return error instanceof Error && error.name === 'AbortError'
      ? 'cancelled'
      : 'failed';
  }
}
