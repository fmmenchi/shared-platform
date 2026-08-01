import type { FieldMessages } from './form-adapter.types.js';

/**
 * The messages a field will actually render: blanks dropped, duplicates
 * dropped, order kept.
 *
 * Both filters are about what reaches a screen reader. A blank message renders
 * an empty element that still joins `aria-describedby`, so the control gains a
 * description made of nothing. A repeated message is announced twice — "Email
 * is required. Email is required." — which is a defect in every case, and it
 * happens for real: two rules that fail together often carry the same sentence.
 *
 * Deduping is also what makes the message its own key. It is the only stable
 * identity a message has — an index changes when an earlier message is fixed,
 * remounting the survivors for no reason — and it can only be a key if it is
 * unique, which is the same property.
 */
export function toMessages(messages: FieldMessages | undefined): FieldMessages {
  if (messages == null) return [];
  const seen = new Set<string>();
  for (const message of messages) {
    if (typeof message === 'string' && message.trim() !== '') seen.add(message);
  }
  return [...seen];
}
