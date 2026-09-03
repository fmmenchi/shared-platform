import type { ReactNode } from 'react';

/**
 * The words a tag's children amount to, or `undefined` when they are not words.
 *
 * It exists because the first version asked `typeof children === 'string'`, and
 * that is false for the most ordinary markup there is: `<Tag>{count} results</Tag>`
 * arrives as an ARRAY of a number and a string. Measured, it fell into the
 * unnamed branch — every tag's remove control called plain "Remove", and a
 * development warning demanding a `name` for children that are entirely plain
 * text. The same lesson `hasRenderableChildren` was extracted for, on the other
 * side of the same question: that one asks whether there is anything at all,
 * this one asks whether it is sayable.
 *
 * A NUMBER IS WORDS. A count, a year, a price — `String()` is what the DOM would
 * have rendered anyway. `null`, `undefined` and booleans render nothing, so they
 * contribute nothing and do not spoil an otherwise textual set; anything else —
 * an element, a fragment, a portal — is a shape rather than a sentence, and the
 * whole thing is then unsayable, because half a name is worse than none.
 *
 * Blank is `undefined` too: a tag labelled with a space has no words in it, and
 * "Remove " is the trailing-off sentence the two-message catalogue exists to
 * make impossible.
 */
export function labelOf(children: ReactNode): string | undefined {
  const text = collect(children);
  if (text === undefined) return undefined;
  const trimmed = text.trim();
  return trimmed === '' ? undefined : trimmed;
}

function collect(node: ReactNode): string | undefined {
  if (typeof node === 'string') return node;
  if (typeof node === 'number') return String(node);
  // Rendered as nothing, so it says nothing — and it must not veto the rest:
  // `{count > 0 && ' more'}` is `false` on the branch that hides it.
  if (node === null || node === undefined || typeof node === 'boolean') {
    return '';
  }
  if (Array.isArray(node)) {
    let joined = '';
    for (const child of node) {
      const part = collect(child);
      if (part === undefined) return undefined;
      joined += part;
    }
    return joined;
  }
  return undefined;
}
