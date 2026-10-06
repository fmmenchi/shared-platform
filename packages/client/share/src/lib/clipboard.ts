/**
 * Write to the clipboard and say whether it happened. `true` only for a write
 * that went through — the clipboard is absent on an insecure origin and on a
 * server, and the browser refuses a write that is not part of a user gesture —
 * and a caller that shows a tick for any of those has told the reader
 * something false.
 *
 * Call it FROM the click, with the string already in hand: an `await` before
 * it spends the gesture, and Safari and Firefox then refuse every time.
 */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
