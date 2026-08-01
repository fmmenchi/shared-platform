import { useEffect } from 'react';
import { deferDevCheck } from '../../primitives/use-dev-warning.js';

/**
 * The way a Tooltip fails in SILENCE.
 *
 * A trigger that swallows the ref makes the whole component a no-op: nothing
 * opens, nothing is described, and nothing is logged. It cannot be told apart
 * from a ref that has not arrived yet by looking once, which is why the check
 * is deferred — see `deferDevCheck`.
 */
export function useTooltipTriggerWarning(
  triggerNode: HTMLElement | null,
): void {
  useEffect(() => {
    if (triggerNode) return;
    return deferDevCheck(() => {
      console.warn(
        'Tooltip: the trigger never received a ref, so the tooltip cannot open ' +
          'or describe anything. `children` must be a component that forwards ' +
          'its `ref` to the DOM element it renders.',
      );
    });
  }, [triggerNode]);
}
