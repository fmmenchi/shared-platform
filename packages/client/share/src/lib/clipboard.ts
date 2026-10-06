/**
 * Write to the clipboard and say whether it happened. `true` only for a write
 * that went through — the clipboard is absent on an insecure origin and on a
 * server, and can be denied by permission, and a caller that shows a tick for
 * any of those has told the reader something false.
 */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
