import { useEffect, useState, type RefObject } from 'react';
import {
  deferDevCheck,
  useDevWarning,
} from '../../primitives/use-dev-warning.js';

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
  open: boolean | undefined,
  hasOpenChange: boolean,
): void {
  // Controlled with nowhere to report to. The browser closes this dialog four
  // ways that never ask React — `Escape`, a backdrop click, `command="close"`
  // and `<form method="dialog">` — and every one of them is granted, so the
  // consumer's prop is simply left saying something that is no longer true.
  // (It is granted on purpose: re-asserting the prop over a close request was
  // measured to trap the user inside an undismissable modal.)
  useDevWarning(
    open !== undefined && !hasOpenChange,
    'Dialog: `open` was given without `onOpenChange`, so nothing tells you ' +
      'when the browser closes it — Escape, the backdrop, the close button ' +
      'and a `method="dialog"` form all close it without asking, and your ' +
      '`open` will still say true. Pass `onOpenChange`, or drop `open` and ' +
      'let the DOM own the state.',
  );

  // The switch React itself warns about for every other control.
  // `useState`, not a ref: the initial value is stable AND readable during
  // render, which a ref is not (the compiler's lint says so, and is right).
  const [wasControlled] = useState(open !== undefined);
  useDevWarning(
    wasControlled !== (open !== undefined),
    'Dialog: `open` switched between controlled and uncontrolled. Decide once ' +
      '— pass `open` for the whole life of the component, or `defaultOpen`.',
  );

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
