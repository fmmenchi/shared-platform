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

/**
 * The way a Tooltip fails for everyone who is not holding a mouse.
 *
 * A tooltip is reached by HOVER or by FOCUS, so a trigger that cannot take
 * focus has only the first — and the author never finds out, because while
 * they write it they are holding a mouse. Measured in Chromium's accessibility
 * tree, this is what is left of the tooltip in each shape:
 *
 * - `<span>i</span>` — not in the tab order, and the description hangs off a
 *   node with role `generic` and an EMPTY name, which a screen reader does not
 *   announce. The text is in the DOM and reaches nobody.
 * - `<span tabindex="0">i</span>` — the instinctive repair, and worse: now it
 *   is a tab stop with no role and no name, so a keyboard user lands on
 *   nothing and is read a description of it.
 * - `<button aria-label="Details">i</button>` — role, name AND description.
 *   The only shape that carries the text to everyone.
 *
 * Which is why only an interactive element may trigger a tooltip, and why an
 * icon that stands ALONE is not a tooltip at all: it is a disclosure — a real
 * button, with a name of its own, showing real content (a `Popover` here).
 * Adding a control purely to host a tooltip is the thing to avoid, not the fix.
 *
 * A disabled control gets its own sentence because it looks focusable and is
 * not: the attribute takes it out of the tab order without touching `tabIndex`.
 */
export function useTooltipUnfocusableWarning(
  triggerNode: HTMLElement | null,
): void {
  useEffect(() => {
    if (!triggerNode) return;
    // Deferred like the ref check above, and for the same reason: a trigger
    // given its `tabIndex` by something that renders after it has not got one
    // on the first effect pass, and warning about correct code is worse than
    // saying nothing.
    return deferDevCheck(() => {
      if (triggerNode.matches(':disabled')) {
        console.warn(
          'Tooltip: the trigger is disabled, so it is out of the tab order ' +
            'and the keyboard can never reach this tooltip. Put the tooltip ' +
            'on a wrapper around the control, or the text beside it.',
        );
        return;
      }
      if (triggerNode.tabIndex >= 0) return;
      console.warn(
        'Tooltip: the trigger cannot take focus, so only a pointer will ever ' +
          'reach this tooltip — and the description is attached to an element ' +
          'with no name, which a screen reader does not announce. Only an ' +
          'interactive element should trigger a tooltip. An icon that stands ' +
          'alone is a disclosure, not a tooltip: give it a button with a name ' +
          'of its own and show the text in a `Popover`.',
      );
    });
  }, [triggerNode]);
}
