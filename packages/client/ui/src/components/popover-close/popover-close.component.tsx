import type { ElementType } from 'react';
import { usePopoverPart } from '../popover/popover.context.js';
import { Button } from '../button/button.component.js';
import type { PopoverCloseProps } from './popover-close.types.js';

/**
 * Closes the popover from inside it — declaratively, like the trigger:
 * `popovertargetaction="hide"`, no handler, and the focus goes back to the
 * trigger because the platform puts it back (measured).
 *
 * It earns its place for one reason: the surface's id is generated and internal,
 * so without this part there is no way to write that attribute yourself.
 */
function PopoverClose<As extends ElementType = typeof Button>(
  props: PopoverCloseProps<As>,
) {
  const { as, ...rest } = props as PopoverCloseProps<'button'> & {
    as?: ElementType;
  };
  const Component = as ?? Button;
  const popover = usePopoverPart('PopoverClose');

  return (
    <Component
      type="button"
      {...rest}
      popoverTarget={popover?.surfaceId}
      popoverTargetAction="hide"
    />
  );
}

export { PopoverClose };
