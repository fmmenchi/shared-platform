import { given } from './given.js';
import type { NativeShareOutcome, ShareContent } from './share.types.js';

/**
 * What the platform is handed: the three members and nothing else the caller's
 * object may carry (a `ShareData` with `files` is assignable to `ShareContent`),
 * and only the ones that were given. An empty `url` is left out, because the
 * sheet reads `''` as "the current page" — the fallback this package does not
 * have.
 */
const shareData = (content: ShareContent): ShareData => {
  const title = given(content.title);
  const text = given(content.text);
  return {
    ...(content.url && { url: content.url }),
    ...(title && { title }),
    ...(text && { text }),
  };
};

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
  return navigator.canShare(shareData(content));
}

/**
 * Open the native share sheet. Never rejects — see `NativeShareOutcome` for
 * what each ending does and does not mean. Call it from a click: without a
 * user gesture the browser refuses, and that is a `failed`.
 */
export async function shareNatively(
  content: ShareContent,
): Promise<NativeShareOutcome> {
  if (!canShareNatively()) return 'unavailable';
  try {
    await navigator.share(shareData(content));
    return 'shared';
  } catch (error) {
    /* By name, not `instanceof`: an error from another realm (an iframe's
       navigator, a test's) is no instance of this realm's `Error`. */
    return (error as { name?: unknown } | null)?.name === 'AbortError'
      ? 'cancelled'
      : 'failed';
  }
}
