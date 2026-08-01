import { useState } from 'react';
import { useDevWarning } from '../../primitives/use-dev-warning.js';

/**
 * What goes wrong with the controlled half, and in silence.
 *
 * Both conditions are answered from props, so they are `useDevWarning` and not
 * the deferred kind — nothing here asks the DOM anything.
 */
export function usePopoverControlWarnings(
  open: boolean | undefined,
  hasOpenChange: boolean,
): void {
  // Controlled with nowhere to report to. The platform hides an `auto` popover
  // three ways that never ask React — a click outside, `Escape`, another
  // popover opening — and every one of them is granted, so the consumer's prop
  // is left saying something that is no longer true. (Granted on purpose:
  // re-asserting it over a dismissal was measured to leave a surface that
  // nothing could close, eating every outside click behind it.)
  useDevWarning(
    open !== undefined && !hasOpenChange,
    'Popover: `open` was given without `onOpenChange`, so nothing tells you ' +
      'when the platform hides it — a click outside, Escape and another ' +
      'popover opening all dismiss it without asking, and your `open` will ' +
      'still say true. Pass `onOpenChange`, or drop `open` and let the DOM ' +
      'own the state.',
  );

  // `useState`, not a ref: the initial value is stable AND readable during
  // render, which a ref is not.
  const [wasControlled] = useState(open !== undefined);
  useDevWarning(
    wasControlled !== (open !== undefined),
    'Popover: `open` switched between controlled and uncontrolled. Decide ' +
      'once — pass `open` for the whole life of the component, or `defaultOpen`.',
  );
}
