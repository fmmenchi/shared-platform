import { useEffect } from 'react';

/**
 * Dev-only warning: logs `message` when `active` is true (re-fires only on
 * condition/message change). A no-op in production. Keeps dev guards out of
 * component bodies — call it with the condition computed at the call site.
 *
 * @example
 * useDevWarning(
 *   isIconOnly && !ariaLabel && !ariaLabelledby,
 *   'Button: an icon-only button needs an `aria-label`.',
 * );
 */
export function useDevWarning(active: boolean, message: string): void {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production' && active) {
      console.warn(message);
    }
  }, [active, message]);
}

/**
 * Dev-only, one task later — for a warning whose condition is a DOM question.
 *
 * `useDevWarning` above takes a boolean computed during render: the right shape
 * for a question about props, the wrong one for a question about a node.
 * Measured independently in two components before this existed — the FIRST
 * effect pass reads `null` for a perfectly good ref, and for a context value a
 * child has not registered yet; the second reads both. Checking immediately
 * therefore warns about correct code, which is worse than not warning at all.
 * One task later is after React has flushed the update the ref callback or the
 * registration scheduled, and is the first moment the answer is honest.
 *
 * Returns its cleanup, so a component's guard stays one line inside its own
 * effect and keeps its own dependency list:
 *
 *     useEffect(() => deferDevCheck(() => { … }), [invoker]);
 */
export function deferDevCheck(check: () => void): () => void {
  if (process.env.NODE_ENV === 'production') return () => undefined;
  const timer = setTimeout(check);
  return () => clearTimeout(timer);
}
