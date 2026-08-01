import type { BoundField } from './form-adapter.types.js';

/**
 * Normalise the three shapes an adapter may return into a list of messages with
 * stable keys, so each renders as its own element instead of being joined.
 *
 * The key matters: for a keyed object it is the rule that failed, which is
 * stable across renders as a list key should be. For an array there is nothing
 * better than the index, and for a lone string nothing is needed.
 */
export function toMessages(
  error: BoundField['error'],
): ReadonlyArray<{ key: string; message: string }> {
  if (error == null) return [];
  if (typeof error === 'string') {
    return error.trim() === '' ? [] : [{ key: error, message: error }];
  }
  if (Array.isArray(error)) {
    return error
      .filter((m) => typeof m === 'string' && m.trim() !== '')
      .map((message, index) => ({ key: `${index}-${message}`, message }));
  }
  return Object.entries(error as Record<string, string>)
    .filter(
      ([, message]) => typeof message === 'string' && message.trim() !== '',
    )
    .map(([key, message]) => ({ key, message }));
}
