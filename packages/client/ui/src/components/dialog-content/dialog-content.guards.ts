import { useEffect, type RefObject } from 'react';
import { deferDevCheck } from '../../primitives/use-dev-warning.js';

/**
 * The two ways a Dialog is misused that otherwise fail in SILENCE.
 *
 * Both are DOM questions — whether the surface ended up with an accessible
 * name, and what tag the trigger actually rendered — so neither can be answered
 * by `useDevWarning`, which takes a condition computed during render. They are
 * deferred for the reason `deferDevCheck` documents: the heading registers and
 * the invoker arrives after the first effect pass, so checking immediately
 * would warn about correct code.
 */
export function useDialogContentWarnings(
  surface: RefObject<HTMLDialogElement | null>,
  invoker: HTMLElement | null | undefined,
): void {
  useEffect(() => {
    const node = surface.current;
    if (!node) return;

    return deferDevCheck(() => {
      if (
        !node.getAttribute('aria-labelledby') &&
        !node.getAttribute('aria-label')
      ) {
        console.warn(
          'Dialog: this dialog has no accessible name, so it is announced as ' +
            '"dialog" and nothing else. Give it a <DialogHeading>, or an ' +
            '`aria-label`.',
        );
      }

      // `commandfor` works on a `<button>` and on nothing else, so a trigger
      // rendered `as` anything else is silently dead — and only on browsers
      // that HAVE invoker commands, which is the worst kind of dead.
      if (invoker && invoker.tagName !== 'BUTTON') {
        console.warn(
          `Dialog: the trigger renders a <${invoker.tagName.toLowerCase()}>, ` +
            'but `commandfor` only works on a <button>, so this dialog will ' +
            'never open. Use `as` with something that ends in a button.',
        );
      }
    });
  }, [surface, invoker]);
}
