import { useState } from 'react';
import { useDevWarning } from '../../primitives/use-dev-warning.js';

/** What goes wrong with the controlled half, and in silence. */
export function useControlWarnings(
  open: boolean | undefined,
  hasOpenChange: boolean,
): void {
  // Controlled with nowhere to report to. The prop wins back every toggle, and
  // `<summary>` is toggled by click, `Enter` and `Space` without asking React —
  // so without `onOpenChange` the panel shuts again on the next render and
  // cannot be opened at all.
  useDevWarning(
    open !== undefined && !hasOpenChange,
    'AccordionItem: `open` was given without `onOpenChange`, so nothing can ' +
      'ever open it — the click, Enter and Space all report to a handler that ' +
      'is not there, and the next render closes it again. Pass ' +
      '`onOpenChange`, or drop `open` and let the DOM own the state.',
  );

  // `useState`, not a ref: the initial value is stable AND readable during
  // render, which a ref is not.
  const [wasControlled] = useState(open !== undefined);
  useDevWarning(
    wasControlled !== (open !== undefined),
    'AccordionItem: `open` switched between controlled and uncontrolled. ' +
      'Decide once — pass `open` for the whole life of the component, or ' +
      '`defaultOpen`.',
  );
}
