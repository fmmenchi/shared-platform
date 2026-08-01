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
  // Controlled with nowhere to report to. The prop wins back every hide, and
  // the platform hides an `auto` popover three ways that never ask React — a
  // click outside, `Escape`, another popover opening — so without
  // `onOpenChange` it reappears on the next render and cannot be dismissed.
  useDevWarning(
    open !== undefined && !hasOpenChange,
    'Popover: `open` was given without `onOpenChange`, so nothing can ever ' +
      'close it — a click outside, Escape and the close button all report to ' +
      'a handler that is not there, and the next render reopens it. Pass ' +
      '`onOpenChange`, or drop `open` and let the DOM own the state.',
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
