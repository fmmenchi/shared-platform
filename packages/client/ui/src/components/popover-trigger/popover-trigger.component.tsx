import { useCallback, type ElementType } from 'react';
import { mergeRefs } from '../../primitives/merge-refs.js';
import { usePopoverPart } from '../popover/popover.context.js';
import { Button } from '../button/button.component.js';
import type { PopoverTriggerProps } from './popover-trigger.types.js';

/**
 * Opens the popover — and there is no handler here to do it, which is the whole
 * point: `popovertarget` names the surface and the browser toggles it, so the
 * control works before React has hydrated and cannot get out of step with the
 * platform's own idea of what is open.
 *
 * What we add is what the platform does not expose: `aria-expanded`, so a screen
 * reader is told the state the browser is keeping, `aria-controls`, so it can be
 * navigated to (ADR-0021), and `aria-haspopup="dialog"`, so it is told what will
 * appear. The ref goes to the context because the
 * surface anchors to this element.
 *
 * A `Button` by default, so a trigger looks like the rest of the system; `as`
 * takes anything that ends in a `<button>`.
 */
function PopoverTrigger(props: PopoverTriggerProps) {
  const { as, ref, onClick, ...rest } = props;
  // Cast at the render site, not in the prop type: `as` is CONSTRAINED to
  // something that takes a Button's props, which is what makes the contract
  // strict, and a constrained `ElementType` is not directly callable in JSX.
  const Component = (as ?? Button) as ElementType;
  const popover = usePopoverPart('PopoverTrigger');

  const controlled = popover?.controlled;
  const reportOpen = popover?.reportOpen;

  const handleClick = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      onClick?.(event);
      if (event.defaultPrevented) return;

      // Controlled: ASK, do not toggle. Measured before this — `popovertarget`
      // opened the surface behind React's back, the `toggle` reached a sync
      // that still saw `open={false}`, and it was hidden again inside the same
      // frame, so a controlled popover could not be opened from its own
      // trigger at all.
      if (controlled !== undefined) reportOpen?.(!controlled);
    },
    [onClick, controlled, reportOpen],
  );

  return (
    <Component
      type="button"
      {...rest}
      ref={mergeRefs(popover?.setAnchor, ref)}
      onClick={handleClick}
      // No `popovertarget` while controlled: two owners for one state is how
      // the surface ended up opening and hiding itself in the same frame.
      popoverTarget={controlled === undefined ? popover?.surfaceId : undefined}
      aria-controls={popover?.surfaceId}
      aria-expanded={popover?.open ?? false}
      aria-haspopup="dialog"
    />
  );
}

export { PopoverTrigger };
